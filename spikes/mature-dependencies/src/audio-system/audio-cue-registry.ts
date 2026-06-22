import {
  audioBusIds,
  createAudioDiagnostic,
  type AudioBusId,
  type AudioBusSpec,
  type AudioCueSpec,
  type AudioDiagnostic,
  type AudioSpatialIntent,
  type AudioTimelineBinding
} from "./audio-system-types";

export interface AudioCueInput {
  cueId?: string;
  assetId?: string;
  busId?: AudioBusId;
  gain?: number;
  loop?: boolean;
  declaredDurationMs?: number;
  timeline?: Partial<AudioTimelineBinding>;
  spatial?: Partial<AudioSpatialIntent>;
}

export interface AudioNormalizationResult<TValue> {
  ok: boolean;
  value?: TValue;
  diagnostics: AudioDiagnostic[];
}

export interface AudioCueRegistry {
  listCues(): AudioCueSpec[];
  listBuses(): AudioBusSpec[];
  getCue(cueId: string): AudioNormalizationResult<AudioCueSpec>;
  getBus(busId: AudioBusId): AudioNormalizationResult<AudioBusSpec>;
  normalizeCue(input: AudioCueInput): AudioNormalizationResult<AudioCueSpec>;
}

const defaultBusParents: Record<string, AudioBusId | undefined> = {
  master: undefined,
  music: "master",
  effects: "master",
  ambience: "master",
  dialogue: "master"
};

export function clampUnitGain(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(1, Math.max(0, value));
}

export function createDefaultAudioBuses(overrides: Partial<AudioBusSpec>[] = []): AudioBusSpec[] {
  const overrideMap = new Map(overrides.map((override) => [override.busId, override]));
  return audioBusIds.map((busId) => {
    const override = overrideMap.get(busId);
    return {
      busId,
      parentBusId: defaultBusParents[busId],
      gain: clampUnitGain(override?.gain ?? 1),
      muted: override?.muted ?? false
    };
  });
}

function normalizeSpatialIntent(input: Partial<AudioSpatialIntent> | undefined): AudioSpatialIntent {
  if (!input || input.mode === undefined || input.mode === "none") {
    return {
      mode: "none"
    };
  }

  if (input.mode === "entity") {
    return {
      mode: "entity",
      entityId: input.entityId,
      distanceModel: input.distanceModel ?? "inverse",
      refDistance: input.refDistance ?? 1,
      maxDistance: input.maxDistance ?? 10_000,
      rolloffFactor: input.rolloffFactor ?? 1
    };
  }

  return {
    mode: "position",
    position: input.position ?? {
      x: 0,
      y: 0,
      z: 0
    },
    distanceModel: input.distanceModel ?? "inverse",
    refDistance: input.refDistance ?? 1,
    maxDistance: input.maxDistance ?? 10_000,
    rolloffFactor: input.rolloffFactor ?? 1
  };
}

function normalizeTimelineBinding(input: Partial<AudioTimelineBinding> | undefined): AudioTimelineBinding | undefined {
  if (!input?.timelineId) {
    return undefined;
  }

  return {
    timelineId: input.timelineId,
    trackId: input.trackId,
    bindingId: input.bindingId,
    blocking: input.blocking ?? "until-complete",
    completionPolicy: input.completionPolicy ?? "declared-duration"
  };
}

function missingCueDiagnostic(cueId: string): AudioDiagnostic {
  return createAudioDiagnostic("invalid-cue", `Audio cue ${cueId} is not registered.`, "error", false, {
    cueId
  });
}

export function createAudioCueRegistry(
  cueInputs: AudioCueInput[] = [],
  busInputs: Partial<AudioBusSpec>[] = createDefaultAudioBuses()
): AudioCueRegistry {
  const busDiagnostics: AudioDiagnostic[] = [];
  const buses = new Map<AudioBusId, AudioBusSpec>();

  for (const input of busInputs) {
    if (!input.busId) {
      busDiagnostics.push(createAudioDiagnostic("unknown-bus", "Audio bus is missing busId."));
      continue;
    }

    buses.set(input.busId, {
      busId: input.busId,
      parentBusId: input.parentBusId ?? defaultBusParents[input.busId],
      gain: clampUnitGain(input.gain ?? 1),
      muted: input.muted ?? false
    });
  }

  if (!buses.has("master")) {
    buses.set("master", {
      busId: "master",
      gain: 1,
      muted: false
    });
  }

  const normalizeCue = (input: AudioCueInput): AudioNormalizationResult<AudioCueSpec> => {
    const diagnostics: AudioDiagnostic[] = [];

    if (!input.cueId) {
      diagnostics.push(createAudioDiagnostic("invalid-cue", "Audio cue requires cueId."));
    }

    if (!input.assetId) {
      diagnostics.push(createAudioDiagnostic("missing-asset", "Audio cue requires assetId."));
    }

    const requestedBusId = input.busId ?? "effects";
    const bus = buses.get(requestedBusId);
    const busId = bus ? requestedBusId : "master";
    if (!bus) {
      diagnostics.push(
        createAudioDiagnostic("unknown-bus", `Audio bus ${requestedBusId} is not registered; falling back to master.`, "warning", true, {
          busId: requestedBusId
        })
      );
    }

    const gain = clampUnitGain(input.gain ?? 1);
    if (typeof input.gain === "number" && input.gain !== gain) {
      diagnostics.push(
        createAudioDiagnostic("invalid-gain", "Audio cue gain was clamped to the 0..1 range.", "warning", false, {
          requestedGain: input.gain,
          normalizedGain: gain
        })
      );
    }

    const declaredDurationMs =
      typeof input.declaredDurationMs === "number" && Number.isFinite(input.declaredDurationMs) && input.declaredDurationMs >= 0
        ? input.declaredDurationMs
        : 0;
    if (input.declaredDurationMs !== undefined && input.declaredDurationMs !== declaredDurationMs) {
      diagnostics.push(
        createAudioDiagnostic("invalid-duration", "Audio cue declared duration was normalized to zero.", "warning", false, {
          requestedDurationMs: input.declaredDurationMs
        })
      );
    }

    const ok = Boolean(input.cueId && input.assetId);
    return {
      ok,
      value: ok
        ? {
            cueId: input.cueId as string,
            assetId: input.assetId as string,
            busId,
            gain,
            loop: input.loop ?? false,
            declaredDurationMs,
            timeline: normalizeTimelineBinding(input.timeline),
            spatial: normalizeSpatialIntent(input.spatial)
          }
        : undefined,
      diagnostics
    };
  };

  const cueResults = cueInputs.map(normalizeCue);
  const cues = new Map(cueResults.flatMap((result) => (result.value ? [[result.value.cueId, result.value] as const] : [])));

  return {
    listCues: () => [...cues.values()],
    listBuses: () => [...buses.values()],
    getCue: (cueId) => {
      const cue = cues.get(cueId);
      return cue
        ? {
            ok: true,
            value: cue,
            diagnostics: []
          }
        : {
            ok: false,
            diagnostics: [missingCueDiagnostic(cueId)]
          };
    },
    getBus: (busId) => {
      const bus = buses.get(busId);
      return bus
        ? {
            ok: true,
            value: bus,
            diagnostics: busDiagnostics
          }
        : {
            ok: false,
            diagnostics: [
              createAudioDiagnostic("unknown-bus", `Audio bus ${busId} is not registered.`, "error", false, {
                busId
              })
            ]
          };
    },
    normalizeCue
  };
}
