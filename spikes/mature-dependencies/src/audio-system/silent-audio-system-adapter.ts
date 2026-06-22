import { createAudioCueRegistry, createDefaultAudioBuses, type AudioCueRegistry } from "./audio-cue-registry";
import {
  createAudioCommandResult,
  createAudioDiagnostic,
  type AudioBusId,
  type AudioBusSpec,
  type AudioCommand,
  type AudioCommandResult,
  type AudioCueEvent,
  type AudioCueEventType,
  type AudioCueSpec,
  type AudioCueSnapshot,
  type AudioDiagnostic,
  type AudioJsonObject,
  type AudioListenerState,
  type AudioSpatialPosition,
  type AudioSystem,
  type AudioSystemConfig,
  type AudioUserPreferenceState
} from "./audio-system-types";

export interface SilentAudioSystemOptions {
  config?: Partial<AudioSystemConfig>;
  registry?: AudioCueRegistry;
  fallbackReason?: string;
  now?: () => number;
}

const defaultPreferences: AudioUserPreferenceState = {
  masterVolume: 1,
  muted: false,
  busVolumes: {},
  busMutes: {},
  captionsEnabled: false
};

const defaultListener: AudioListenerState = {
  position: {
    x: 0,
    y: 0,
    z: 0
  },
  forward: {
    x: 0,
    y: 0,
    z: -1
  },
  up: {
    x: 0,
    y: 1,
    z: 0
  }
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function defaultConfig(overrides: Partial<AudioSystemConfig> | undefined, buses: AudioBusSpec[]): AudioSystemConfig {
  return {
    adapterId: "silent-audio-system-adapter",
    lifecycle: "silent",
    unlockPolicy: "silent-until-unlocked",
    defaultBusId: "effects",
    diagnosticsLevel: "standard",
    ...overrides,
    buses: overrides?.buses ?? buses,
    preferences: {
      ...defaultPreferences,
      ...overrides?.preferences,
      busVolumes: {
        ...defaultPreferences.busVolumes,
        ...overrides?.preferences?.busVolumes
      },
      busMutes: {
        ...defaultPreferences.busMutes,
        ...overrides?.preferences?.busMutes
      }
    }
  };
}

interface ResolvedCue {
  ok: boolean;
  value?: AudioCueSpec;
  diagnostics: AudioDiagnostic[];
}

function isPosition(value: unknown): value is AudioSpatialPosition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const position = value as Record<string, unknown>;
  return ["x", "y", "z"].every((key) => typeof position[key] === "number" && Number.isFinite(position[key]));
}

function readListenerPayload(payload: AudioJsonObject): Partial<AudioListenerState> {
  const listener = payload.listener;
  if (!listener || typeof listener !== "object" || Array.isArray(listener)) {
    return {};
  }

  const record = listener as Record<string, unknown>;
  return {
    ...(isPosition(record.position) ? { position: record.position } : {}),
    ...(isPosition(record.forward) ? { forward: record.forward } : {}),
    ...(isPosition(record.up) ? { up: record.up } : {})
  };
}

function readNumberPayload(payload: AudioJsonObject, key: string): number | undefined {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBooleanPayload(payload: AudioJsonObject, key: string): boolean | undefined {
  const value = payload[key];
  return typeof value === "boolean" ? value : undefined;
}

function commandFor(type: AudioCommand["type"], commandId: string, submittedAt: number): AudioCommand {
  return {
    commandId,
    type,
    submittedAt,
    payload: {}
  };
}

export function createSilentAudioSystemAdapter(options: SilentAudioSystemOptions = {}): AudioSystem {
  return new SilentAudioSystemAdapter(options);
}

export class SilentAudioSystemAdapter implements AudioSystem {
  readonly config: AudioSystemConfig;

  private readonly registry: AudioCueRegistry;
  private readonly fallbackReason: string;
  private readonly now: () => number;
  private readonly diagnostics = [
    createAudioDiagnostic("silent-fallback", "Silent AudioSystem adapter is active.", "info", false)
  ];
  private readonly cueSnapshots = new Map<string, AudioCueSnapshot>();
  private listener: AudioListenerState = cloneJson(defaultListener);
  private eventSequence = 0;
  private state: AudioSystemConfig["lifecycle"] = "silent";

  constructor(options: SilentAudioSystemOptions = {}) {
    this.registry = options.registry ?? createAudioCueRegistry();
    this.fallbackReason = options.fallbackReason ?? "Web Audio is unavailable; AudioSystem is using silent fallback.";
    this.now = options.now ?? Date.now;
    this.config = defaultConfig(options.config, this.registry.listBuses().length > 0 ? this.registry.listBuses() : createDefaultAudioBuses());
    this.state = this.config.lifecycle === "disposed" ? "disposed" : "silent";
    this.config.lifecycle = this.state;
  }

  get lifecycle(): AudioSystemConfig["lifecycle"] {
    return this.state;
  }

  async boot(): Promise<AudioCommandResult> {
    return this.accept(commandFor("unlock", "silent-audio-boot", this.now()), "fallback", {
      adapterId: this.config.adapterId,
      lifecycle: this.lifecycle
    });
  }

  async unlock(command: AudioCommand): Promise<AudioCommandResult> {
    return this.accept(command, "fallback", {
      lifecycle: this.lifecycle,
      unlocked: false,
      silent: true
    });
  }

  async preload(command: AudioCommand): Promise<AudioCommandResult> {
    const cueResult = this.resolveCue(command);
    if (!cueResult.ok) {
      return this.fail(command, cueResult.diagnostics);
    }

    const cue = cueResult.value;
    if (!cue) {
      return this.fail(command, cueResult.diagnostics);
    }

    return this.accept(command, "fallback", {
      cueId: cue.cueId,
      assetId: cue.assetId,
      silent: true
    });
  }

  async play(command: AudioCommand): Promise<AudioCommandResult> {
    const cueResult = this.resolveCue(command);
    if (!cueResult.ok) {
      return this.fail(command, cueResult.diagnostics);
    }

    const cue = cueResult.value;
    if (!cue) {
      return this.fail(command, cueResult.diagnostics);
    }

    const startedAt = this.now();
    const durationMs = cue.timeline?.completionPolicy === "immediate" ? 0 : cue.declaredDurationMs;
    const started = this.createEvent("started", cue.cueId, command, cue.busId, startedAt);
    const snapshot: AudioCueSnapshot = {
      cueId: cue.cueId,
      assetId: cue.assetId,
      busId: cue.busId,
      state: "playing",
      gain: cue.gain,
      loop: cue.loop,
      timeline: cue.timeline,
      spatial: cue.spatial
    };
    const events = [started];

    if (!cue.loop && cue.timeline?.completionPolicy !== "manual") {
      snapshot.state = "ended";
      events.push(this.createEvent("ended", cue.cueId, command, cue.busId, startedAt + durationMs));
      events.push(this.createEvent("completed", cue.cueId, command, cue.busId, startedAt + durationMs));
    }

    this.cueSnapshots.set(cue.cueId, snapshot);
    return this.accept(command, "fallback", {
      cueId: cue.cueId,
      completionPolicy: cue.timeline?.completionPolicy ?? "declared-duration",
      declaredDurationMs: cue.declaredDurationMs,
      silent: true
    }, events, durationMs);
  }

  async stop(command: AudioCommand): Promise<AudioCommandResult> {
    const cueId = command.cueId;
    if (!cueId || !this.cueSnapshots.has(cueId)) {
      return this.fail(command, [createAudioDiagnostic("invalid-cue", `Audio cue ${cueId ?? "<missing>"} is not active.`)]);
    }

    const snapshot = this.cueSnapshots.get(cueId);
    if (!snapshot) {
      return this.fail(command, [createAudioDiagnostic("invalid-cue", `Audio cue ${cueId} is not active.`)]);
    }

    snapshot.state = "interrupted";
    this.cueSnapshots.set(cueId, snapshot);
    const interrupted = this.createEvent("interrupted", cueId, command, snapshot.busId, this.now(), [
      createAudioDiagnostic("interrupted-cue", `Audio cue ${cueId} was stopped by command ${command.commandId}.`, "info")
    ]);

    return this.accept(command, "completed", { cueId, silent: true }, [interrupted]);
  }

  async pauseBus(command: AudioCommand): Promise<AudioCommandResult> {
    return this.updateBusPlayback(command, "paused");
  }

  async resumeBus(command: AudioCommand): Promise<AudioCommandResult> {
    return this.updateBusPlayback(command, "playing");
  }

  async setBusGain(command: AudioCommand): Promise<AudioCommandResult> {
    const bus = this.getMutableBus(command.busId ?? this.config.defaultBusId);
    if (!bus) {
      return this.fail(command, [this.unknownBus(command.busId ?? this.config.defaultBusId)]);
    }

    const gain = readNumberPayload(command.payload, "gain");
    if (gain === undefined) {
      return this.fail(command, [createAudioDiagnostic("invalid-gain", "Audio bus gain command requires numeric payload.gain.")]);
    }

    bus.gain = Math.min(1, Math.max(0, gain));
    return this.accept(command, "completed", {
      busId: bus.busId,
      gain: bus.gain
    });
  }

  async setBusMuted(command: AudioCommand): Promise<AudioCommandResult> {
    const bus = this.getMutableBus(command.busId ?? this.config.defaultBusId);
    if (!bus) {
      return this.fail(command, [this.unknownBus(command.busId ?? this.config.defaultBusId)]);
    }

    const muted = readBooleanPayload(command.payload, "muted");
    if (muted === undefined) {
      return this.fail(command, [createAudioDiagnostic("invalid-cue", "Audio bus mute command requires boolean payload.muted.")]);
    }

    bus.muted = muted;
    return this.accept(command, "completed", {
      busId: bus.busId,
      muted: bus.muted
    });
  }

  async setListenerTransform(command: AudioCommand): Promise<AudioCommandResult> {
    this.listener = {
      ...this.listener,
      ...readListenerPayload(command.payload)
    };
    return this.accept(command, "completed", {
      listener: {
        position: {
          x: this.listener.position.x,
          y: this.listener.position.y,
          z: this.listener.position.z
        },
        forward: {
          x: this.listener.forward.x,
          y: this.listener.forward.y,
          z: this.listener.forward.z
        },
        up: {
          x: this.listener.up.x,
          y: this.listener.up.y,
          z: this.listener.up.z
        }
      }
    });
  }

  async disposeSceneAudio(command: AudioCommand): Promise<AudioCommandResult> {
    const events: AudioCueEvent[] = [];
    const occurredAt = this.now();

    for (const snapshot of this.cueSnapshots.values()) {
      if (snapshot.state === "playing" || snapshot.state === "paused" || snapshot.state === "queued") {
        snapshot.state = "interrupted";
        events.push(this.createEvent("interrupted", snapshot.cueId, command, snapshot.busId, occurredAt));
      }
    }

    this.cueSnapshots.clear();
    this.state = "disposed";
    this.config.lifecycle = this.state;
    return this.accept(command, "completed", {
      lifecycle: this.lifecycle,
      sceneId: command.sceneId ?? null
    }, events, 0, [createAudioDiagnostic("disposed-scene", "Scene audio resources were disposed.", "info")]);
  }

  async snapshot() {
    return {
      lifecycle: this.lifecycle,
      buses: cloneJson(this.config.buses),
      cues: cloneJson([...this.cueSnapshots.values()]),
      listener: cloneJson(this.listener),
      preferences: cloneJson(this.config.preferences),
      diagnostics: cloneJson(this.diagnostics)
    };
  }

  private resolveCue(command: AudioCommand): ResolvedCue {
    const fromRegistry = command.cueId ? this.registry.getCue(command.cueId) : undefined;
    if (fromRegistry?.ok && fromRegistry.value) {
      return {
        ok: true as const,
        value: fromRegistry.value,
        diagnostics: fromRegistry.diagnostics
      };
    }

    if (fromRegistry && !command.assetId) {
      return fromRegistry;
    }

    return this.registry.normalizeCue({
      cueId: command.cueId,
      assetId: command.assetId,
      busId: command.busId ?? this.config.defaultBusId,
      declaredDurationMs: readNumberPayload(command.payload, "declaredDurationMs"),
      gain: readNumberPayload(command.payload, "gain"),
      loop: readBooleanPayload(command.payload, "loop"),
      timeline:
        command.payload.timeline && typeof command.payload.timeline === "object" && !Array.isArray(command.payload.timeline)
          ? command.payload.timeline
          : undefined,
      spatial:
        command.payload.spatial && typeof command.payload.spatial === "object" && !Array.isArray(command.payload.spatial)
          ? command.payload.spatial
          : undefined
    }) as ResolvedCue;
  }

  private updateBusPlayback(command: AudioCommand, state: "playing" | "paused"): Promise<AudioCommandResult> {
    const busId = command.busId ?? this.config.defaultBusId;
    const bus = this.getMutableBus(busId);
    if (!bus) {
      return Promise.resolve(this.fail(command, [this.unknownBus(busId)]));
    }

    let affected = 0;
    for (const snapshot of this.cueSnapshots.values()) {
      if (snapshot.busId === bus.busId && (snapshot.state === "playing" || snapshot.state === "paused")) {
        snapshot.state = state;
        affected += 1;
      }
    }

    return Promise.resolve(this.accept(command, "completed", { busId: bus.busId, affected }));
  }

  private accept(
    command: AudioCommand,
    status: "fallback" | "completed",
    value: AudioJsonObject,
    events: AudioCueEvent[] = [],
    durationMs = 0,
    diagnostics = this.fallbackDiagnostics()
  ): AudioCommandResult {
    return createAudioCommandResult(status, command, {
      value,
      events,
      durationMs,
      diagnostics
    });
  }

  private fail(command: AudioCommand, diagnostics: ReturnType<typeof createAudioDiagnostic>[]): AudioCommandResult {
    return createAudioCommandResult("failed", command, {
      diagnostics
    });
  }

  private fallbackDiagnostics() {
    return [createAudioDiagnostic("silent-fallback", this.fallbackReason, "info")];
  }

  private createEvent(
    type: AudioCueEventType,
    cueId: string,
    command: AudioCommand,
    busId: AudioBusId,
    occurredAt: number,
    diagnostics: ReturnType<typeof createAudioDiagnostic>[] = []
  ): AudioCueEvent {
    this.eventSequence += 1;
    return {
      eventId: `${command.commandId}:${type}:${this.eventSequence}`,
      cueId,
      commandId: command.commandId,
      type,
      occurredAt,
      busId,
      diagnostics
    };
  }

  private getMutableBus(busId: AudioBusId): AudioBusSpec | undefined {
    return this.config.buses.find((bus) => bus.busId === busId);
  }

  private unknownBus(busId: AudioBusId) {
    return createAudioDiagnostic("unknown-bus", `Audio bus ${busId} is not registered.`, "error", false, { busId });
  }
}
