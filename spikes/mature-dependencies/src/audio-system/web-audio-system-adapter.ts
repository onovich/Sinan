import { createAudioCueRegistry, createDefaultAudioBuses, type AudioCueRegistry } from "./audio-cue-registry";
import { createSilentAudioSystemAdapter } from "./silent-audio-system-adapter";
import {
  createAudioCommandResult,
  createAudioDiagnostic,
  type AudioBusId,
  type AudioBusSpec,
  type AudioCommand,
  type AudioCommandResult,
  type AudioCueEvent,
  type AudioCueEventType,
  type AudioCueSnapshot,
  type AudioDiagnostic,
  type AudioJsonObject,
  type AudioListenerState,
  type AudioSpatialPosition,
  type AudioSystem,
  type AudioSystemConfig,
  type AudioTimelineBinding,
  type AudioUserPreferenceState
} from "./audio-system-types";

interface AudioParamLike {
  value: number;
  setValueAtTime?: (value: number, startTime: number) => void;
}

interface AudioNodeLike {
  connect(destination: AudioNodeLike): AudioNodeLike | void;
  disconnect?: () => void;
}

interface GainNodeLike extends AudioNodeLike {
  gain: AudioParamLike;
}

interface PannerNodeLike extends AudioNodeLike {
  panningModel?: PanningModelType;
  distanceModel?: DistanceModelType;
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
  positionX?: AudioParamLike;
  positionY?: AudioParamLike;
  positionZ?: AudioParamLike;
  setPosition?: (x: number, y: number, z: number) => void;
}

interface BufferSourceNodeLike extends AudioNodeLike {
  buffer: unknown;
  loop: boolean;
  onended: (() => void) | null;
  start(when?: number): void;
  stop(when?: number): void;
}

interface AudioListenerLike {
  positionX?: AudioParamLike;
  positionY?: AudioParamLike;
  positionZ?: AudioParamLike;
  forwardX?: AudioParamLike;
  forwardY?: AudioParamLike;
  forwardZ?: AudioParamLike;
  upX?: AudioParamLike;
  upY?: AudioParamLike;
  upZ?: AudioParamLike;
  setPosition?: (x: number, y: number, z: number) => void;
  setOrientation?: (forwardX: number, forwardY: number, forwardZ: number, upX: number, upY: number, upZ: number) => void;
}

export interface WebAudioContextLike {
  readonly sampleRate: number;
  readonly currentTime: number;
  readonly destination: AudioNodeLike;
  readonly listener?: AudioListenerLike;
  state: AudioContextState;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  close(): Promise<void>;
  createGain(): GainNodeLike;
  createPanner(): PannerNodeLike;
  createBufferSource(): BufferSourceNodeLike;
  createBuffer?(channels: number, frameCount: number, sampleRate: number): unknown;
  decodeAudioData?(data: ArrayBuffer): Promise<unknown>;
}

export type WebAudioContextConstructor = new () => WebAudioContextLike;

export interface WebAudioSystemAdapterOptions {
  config?: Partial<AudioSystemConfig>;
  registry?: AudioCueRegistry;
  AudioContextCtor?: WebAudioContextConstructor;
  assetData?: Record<string, ArrayBuffer>;
  decodeAsset?: (assetId: string, context: WebAudioContextLike) => Promise<unknown>;
  now?: () => number;
}

interface ActiveCue {
  commandId: string;
  source: BufferSourceNodeLike;
  gain: GainNodeLike;
  panner?: PannerNodeLike;
  snapshot: AudioCueSnapshot;
  completionPolicy?: AudioTimelineBinding["completionPolicy"];
}

interface ResolvedCue {
  ok: boolean;
  value?: AudioCueSnapshot;
  assetId?: string;
  declaredDurationMs?: number;
  timeline?: AudioTimelineBinding;
  diagnostics: AudioDiagnostic[];
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

function getGlobalAudioContext(): WebAudioContextConstructor | undefined {
  const scope = globalThis as typeof globalThis & {
    webkitAudioContext?: new () => AudioContext;
  };
  return (scope.AudioContext ?? scope.webkitAudioContext) as unknown as WebAudioContextConstructor | undefined;
}

function createConfig(overrides: Partial<AudioSystemConfig> | undefined, buses: AudioBusSpec[]): AudioSystemConfig {
  return {
    adapterId: "web-audio-system-adapter",
    lifecycle: "locked",
    unlockPolicy: "require-user-gesture",
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

function setParam(param: AudioParamLike | undefined, value: number, time: number): void {
  if (!param) {
    return;
  }

  if (param.setValueAtTime) {
    param.setValueAtTime(value, time);
    return;
  }

  param.value = value;
}

function clampUnitGain(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(1, Math.max(0, value));
}

function isPosition(value: unknown): value is AudioSpatialPosition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return ["x", "y", "z"].every((key) => typeof record[key] === "number" && Number.isFinite(record[key]));
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

function jsonPosition(position: AudioSpatialPosition): AudioJsonObject {
  return {
    x: position.x,
    y: position.y,
    z: position.z
  };
}

function commandFor(type: AudioCommand["type"], commandId: string, submittedAt: number): AudioCommand {
  return {
    commandId,
    type,
    submittedAt,
    payload: {}
  };
}

export function createWebAudioSystemAdapter(options: WebAudioSystemAdapterOptions = {}): AudioSystem {
  return new WebAudioSystemAdapter(options);
}

export class WebAudioSystemAdapter implements AudioSystem {
  readonly config: AudioSystemConfig;

  private readonly registry: AudioCueRegistry;
  private readonly AudioContextCtor?: WebAudioContextConstructor;
  private readonly assetData: Record<string, ArrayBuffer>;
  private readonly decodeAsset?: (assetId: string, context: WebAudioContextLike) => Promise<unknown>;
  private readonly now: () => number;
  private readonly silentFallback: AudioSystem;
  private readonly decodedAssets = new Map<string, unknown>();
  private readonly busNodes = new Map<AudioBusId, GainNodeLike>();
  private readonly activeCues = new Map<string, ActiveCue>();
  private readonly diagnostics: AudioDiagnostic[] = [];
  private listener: AudioListenerState = cloneJson(defaultListener);
  private context?: WebAudioContextLike;
  private state: AudioSystemConfig["lifecycle"] = "locked";
  private eventSequence = 0;

  constructor(options: WebAudioSystemAdapterOptions = {}) {
    this.registry = options.registry ?? createAudioCueRegistry();
    this.AudioContextCtor = options.AudioContextCtor ?? getGlobalAudioContext();
    this.assetData = options.assetData ?? {};
    this.decodeAsset = options.decodeAsset;
    this.now = options.now ?? Date.now;
    this.config = createConfig(options.config, this.registry.listBuses().length > 0 ? this.registry.listBuses() : createDefaultAudioBuses());
    this.state = this.AudioContextCtor ? this.config.lifecycle : "unsupported";
    this.config.lifecycle = this.state;
    this.silentFallback = createSilentAudioSystemAdapter({
      config: {
        ...this.config,
        adapterId: `${this.config.adapterId}:silent-fallback`,
        lifecycle: "silent"
      },
      registry: this.registry,
      now: this.now
    });
  }

  get lifecycle(): AudioSystemConfig["lifecycle"] {
    return this.state;
  }

  async boot(): Promise<AudioCommandResult> {
    const command = commandFor("unlock", "web-audio-boot", this.now());
    if (!this.AudioContextCtor) {
      return this.fallback(command, [this.unsupportedDiagnostic()]);
    }

    const contextResult = await this.ensureContext();
    if (!contextResult.ok) {
      return this.fallback(command, contextResult.diagnostics);
    }

    if (this.config.unlockPolicy === "attempt-on-boot") {
      return this.unlock(command);
    }

    this.setLifecycle(this.context?.state === "running" ? "running" : "locked");
    return this.result("accepted", command, {
      lifecycle: this.lifecycle,
      contextState: this.context?.state ?? "closed",
      sampleRate: this.context?.sampleRate ?? 0
    }, contextResult.diagnostics);
  }

  async unlock(command: AudioCommand): Promise<AudioCommandResult> {
    const contextResult = await this.ensureContext();
    if (!contextResult.ok || !this.context) {
      return this.fallback(command, contextResult.diagnostics);
    }

    try {
      if (this.context.state !== "running") {
        await this.context.resume();
      }
      this.setLifecycle(this.context.state === "running" ? "running" : "locked");
    } catch (error) {
      const diagnostic = createAudioDiagnostic("unlock-denied", error instanceof Error ? error.message : String(error), "error", true);
      this.diagnostics.push(diagnostic);
      return this.fallback(command, [diagnostic]);
    }

    return this.result("accepted", command, {
      lifecycle: this.lifecycle,
      contextState: this.context.state,
      sampleRate: this.context.sampleRate
    }, this.lifecycle === "running" ? [] : [createAudioDiagnostic("locked-context", "Audio output did not reach running state.", "warning", true)]);
  }

  async preload(command: AudioCommand): Promise<AudioCommandResult> {
    const cue = this.resolveCue(command);
    if (!cue.ok || !cue.assetId) {
      return this.fail(command, cue.diagnostics);
    }

    const running = await this.requireRunning(command);
    if (!running.ok || !running.context) {
      return this.fallback(command, running.diagnostics);
    }

    const decoded = await this.decodeCueAsset(cue.assetId, running.context);
    if (!decoded.ok) {
      return this.fallback(command, decoded.diagnostics);
    }

    return this.result("accepted", command, {
      cueId: command.cueId ?? null,
      assetId: cue.assetId,
      decoded: true
    }, decoded.diagnostics);
  }

  async play(command: AudioCommand): Promise<AudioCommandResult> {
    const cue = this.resolveCue(command);
    if (!cue.ok || !cue.value || !cue.assetId || cue.declaredDurationMs === undefined) {
      return this.fail(command, cue.diagnostics);
    }

    const running = await this.requireRunning(command);
    if (!running.ok || !running.context) {
      return this.fallback(command, running.diagnostics);
    }

    const decoded = await this.decodeCueAsset(cue.assetId, running.context);
    if (!decoded.ok || decoded.buffer === undefined) {
      return this.fallback(command, decoded.diagnostics);
    }

    const busNode = this.busNodes.get(cue.value.busId);
    if (!busNode) {
      return this.fallback(command, [createAudioDiagnostic("unknown-bus", `Audio bus ${cue.value.busId} is not connected.`, "error")]);
    }

    const source = running.context.createBufferSource();
    const gain = running.context.createGain();
    const events = [this.createEvent("started", cue.value.cueId, command, cue.value.busId, this.now())];
    source.buffer = decoded.buffer;
    source.loop = cue.value.loop;
    gain.gain.value = cue.value.gain;

    const panner = this.createSpatialNode(running.context, cue.value, command, events);
    if (panner) {
      source.connect(panner);
      panner.connect(gain);
    } else {
      source.connect(gain);
    }
    gain.connect(busNode);

    const active: ActiveCue = {
      commandId: command.commandId,
      source,
      gain,
      panner,
      snapshot: cloneJson(cue.value),
      completionPolicy: cue.timeline?.completionPolicy
    };
    active.snapshot.state = "playing";
    this.activeCues.set(cue.value.cueId, active);
    source.onended = () => {
      const current = this.activeCues.get(cue.value?.cueId ?? "");
      if (current && current.snapshot.state !== "interrupted") {
        current.snapshot.state = "ended";
      }
    };
    source.start(running.context.currentTime);

    const durationMs = cue.timeline?.completionPolicy === "immediate" ? 0 : cue.declaredDurationMs;
    if (!cue.value.loop && cue.timeline?.completionPolicy !== "manual") {
      events.push(this.createEvent("completed", cue.value.cueId, command, cue.value.busId, this.now() + durationMs));
    }

    return this.result("accepted", command, {
      cueId: cue.value.cueId,
      assetId: cue.assetId,
      busId: cue.value.busId,
      spatial: cue.value.spatial.mode,
      completionPolicy: cue.timeline?.completionPolicy ?? "declared-duration"
    }, decoded.diagnostics, events, durationMs);
  }

  async stop(command: AudioCommand): Promise<AudioCommandResult> {
    const cueId = command.cueId;
    if (!cueId) {
      return this.fail(command, [createAudioDiagnostic("invalid-cue", "Stop command requires cueId.")]);
    }

    const active = this.activeCues.get(cueId);
    if (!active) {
      return this.fail(command, [createAudioDiagnostic("invalid-cue", `Audio cue ${cueId} is not active.`)]);
    }

    try {
      active.source.stop(this.context?.currentTime ?? 0);
    } catch {
      // Stopping an already-ended Web Audio source can throw; the contract state is still interrupted.
    }
    active.source.disconnect?.();
    active.gain.disconnect?.();
    active.panner?.disconnect?.();
    active.snapshot.state = "interrupted";
    return this.result("completed", command, {
      cueId,
      state: active.snapshot.state
    }, [createAudioDiagnostic("interrupted-cue", `Audio cue ${cueId} was stopped.`, "info")], [
      this.createEvent("interrupted", cueId, command, active.snapshot.busId, this.now())
    ]);
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

    bus.gain = clampUnitGain(gain);
    this.refreshBusGain(bus.busId);
    return this.result("completed", command, {
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
    this.refreshBusGain(bus.busId);
    return this.result("completed", command, {
      busId: bus.busId,
      muted: bus.muted
    });
  }

  async setListenerTransform(command: AudioCommand): Promise<AudioCommandResult> {
    this.listener = {
      ...this.listener,
      ...readListenerPayload(command.payload)
    };
    if (this.context?.listener) {
      this.applyListener(this.context.listener);
    }

    return this.result("completed", command, {
      listener: {
        position: jsonPosition(this.listener.position),
        forward: jsonPosition(this.listener.forward),
        up: jsonPosition(this.listener.up)
      }
    });
  }

  async disposeSceneAudio(command: AudioCommand): Promise<AudioCommandResult> {
    const events: AudioCueEvent[] = [];
    for (const active of this.activeCues.values()) {
      try {
        active.source.stop(this.context?.currentTime ?? 0);
      } catch {
        // Idempotent disposal: contract cleanup wins over duplicate Web Audio stop errors.
      }
      active.source.disconnect?.();
      active.gain.disconnect?.();
      active.panner?.disconnect?.();
      active.snapshot.state = "interrupted";
      events.push(this.createEvent("interrupted", active.snapshot.cueId, command, active.snapshot.busId, this.now()));
    }
    this.activeCues.clear();
    this.busNodes.clear();

    if (this.context && this.context.state !== "closed") {
      await this.context.close();
    }
    this.setLifecycle("disposed");
    return this.result("completed", command, {
      lifecycle: this.lifecycle,
      sceneId: command.sceneId ?? null
    }, [createAudioDiagnostic("disposed-scene", "Web Audio scene resources were disposed.", "info")], events);
  }

  async snapshot() {
    return {
      lifecycle: this.lifecycle,
      buses: cloneJson(this.config.buses),
      cues: cloneJson([...this.activeCues.values()].map((entry) => entry.snapshot)),
      listener: cloneJson(this.listener),
      preferences: cloneJson(this.config.preferences),
      diagnostics: cloneJson(this.diagnostics)
    };
  }

  private async ensureContext(): Promise<{ ok: boolean; context?: WebAudioContextLike; diagnostics: AudioDiagnostic[] }> {
    if (this.state === "disposed") {
      return {
        ok: false,
        diagnostics: [createAudioDiagnostic("disposed-scene", "AudioSystem has been disposed.", "error")]
      };
    }

    if (!this.AudioContextCtor) {
      this.setLifecycle("unsupported");
      return {
        ok: false,
        diagnostics: [this.unsupportedDiagnostic()]
      };
    }

    if (!this.context) {
      try {
        this.context = new this.AudioContextCtor();
        this.createBusGraph(this.context);
        this.applyListener(this.context.listener);
      } catch (error) {
        this.setLifecycle("unsupported");
        return {
          ok: false,
          diagnostics: [
            createAudioDiagnostic("unsupported-browser", error instanceof Error ? error.message : String(error), "error", true)
          ]
        };
      }
    }

    this.setLifecycle(this.context.state === "running" ? "running" : "locked");
    return {
      ok: true,
      context: this.context,
      diagnostics: []
    };
  }

  private async requireRunning(command: AudioCommand): Promise<{ ok: boolean; context?: WebAudioContextLike; diagnostics: AudioDiagnostic[] }> {
    const contextResult = await this.ensureContext();
    if (!contextResult.ok || !contextResult.context) {
      return contextResult;
    }

    if (contextResult.context.state === "running") {
      this.setLifecycle("running");
      return contextResult;
    }

    try {
      await contextResult.context.resume();
    } catch (error) {
      return {
        ok: false,
        diagnostics: [
          createAudioDiagnostic("autoplay-denied", error instanceof Error ? error.message : String(error), "warning", true, {
            commandId: command.commandId
          })
        ]
      };
    }

    const stateAfterResume = contextResult.context.state as AudioContextState;
    const running = stateAfterResume === "running";
    this.setLifecycle(running ? "running" : "locked");
    return running
      ? contextResult
      : {
          ok: false,
          diagnostics: [createAudioDiagnostic("locked-context", "Audio output is still locked.", "warning", true)]
        };
  }

  private createBusGraph(context: WebAudioContextLike): void {
    this.busNodes.clear();
    for (const bus of this.config.buses) {
      const node = context.createGain();
      this.busNodes.set(bus.busId, node);
      this.refreshBusGain(bus.busId);
    }

    for (const bus of this.config.buses) {
      const node = this.busNodes.get(bus.busId);
      if (!node) {
        continue;
      }

      if (bus.parentBusId) {
        const parent = this.busNodes.get(bus.parentBusId);
        if (parent) {
          node.connect(parent);
          continue;
        }
      }

      node.connect(context.destination);
    }
  }

  private async decodeCueAsset(
    assetId: string,
    context: WebAudioContextLike
  ): Promise<{ ok: boolean; buffer?: unknown; diagnostics: AudioDiagnostic[] }> {
    const existing = this.decodedAssets.get(assetId);
    if (existing !== undefined) {
      return {
        ok: true,
        buffer: existing,
        diagnostics: []
      };
    }

    try {
      const decoded = this.decodeAsset
        ? await this.decodeAsset(assetId, context)
        : await this.decodeAssetData(assetId, context);
      this.decodedAssets.set(assetId, decoded);
      return {
        ok: true,
        buffer: decoded,
        diagnostics: []
      };
    } catch (error) {
      const diagnostic =
        error instanceof MissingAudioAssetError
          ? createAudioDiagnostic("missing-asset", error.message, "error", true, { assetId })
          : createAudioDiagnostic("decode-failure", error instanceof Error ? error.message : String(error), "error", true, { assetId });
      this.diagnostics.push(diagnostic);
      return {
        ok: false,
        diagnostics: [diagnostic]
      };
    }
  }

  private async decodeAssetData(assetId: string, context: WebAudioContextLike): Promise<unknown> {
    const data = this.assetData[assetId];
    if (!data) {
      throw new MissingAudioAssetError(`Audio asset ${assetId} was not provided to the spike adapter.`);
    }

    if (!context.decodeAudioData) {
      throw new Error("Audio decoding API is unavailable.");
    }

    return context.decodeAudioData(data.slice(0));
  }

  private resolveCue(command: AudioCommand): ResolvedCue {
    const fromRegistry = command.cueId ? this.registry.getCue(command.cueId) : undefined;
    const cueResult =
      fromRegistry?.ok || !fromRegistry || command.assetId
        ? this.registry.normalizeCue({
            cueId: command.cueId,
            assetId: fromRegistry?.value?.assetId ?? command.assetId,
            busId: fromRegistry?.value?.busId ?? command.busId ?? this.config.defaultBusId,
            declaredDurationMs: fromRegistry?.value?.declaredDurationMs ?? readNumberPayload(command.payload, "declaredDurationMs"),
            gain: fromRegistry?.value?.gain ?? readNumberPayload(command.payload, "gain"),
            loop: fromRegistry?.value?.loop ?? readBooleanPayload(command.payload, "loop"),
            timeline: fromRegistry?.value?.timeline,
            spatial: fromRegistry?.value?.spatial
          })
        : fromRegistry;

    if (!cueResult.ok || !cueResult.value) {
      return {
        ok: false,
        diagnostics: cueResult.diagnostics
      };
    }

    return {
      ok: true,
      value: {
        cueId: cueResult.value.cueId,
        assetId: cueResult.value.assetId,
        busId: cueResult.value.busId,
        state: "queued",
        gain: cueResult.value.gain,
        loop: cueResult.value.loop,
        timeline: cueResult.value.timeline,
        spatial: cueResult.value.spatial
      },
      assetId: cueResult.value.assetId,
      declaredDurationMs: cueResult.value.declaredDurationMs,
      timeline: cueResult.value.timeline,
      diagnostics: cueResult.diagnostics
    };
  }

  private createSpatialNode(
    context: WebAudioContextLike,
    cue: AudioCueSnapshot,
    command: AudioCommand,
    events: AudioCueEvent[]
  ): PannerNodeLike | undefined {
    if (cue.spatial.mode === "none") {
      return undefined;
    }

    const panner = context.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = cue.spatial.distanceModel ?? "inverse";
    panner.refDistance = cue.spatial.refDistance ?? 1;
    panner.maxDistance = cue.spatial.maxDistance ?? 10_000;
    panner.rolloffFactor = cue.spatial.rolloffFactor ?? 1;

    const position =
      cue.spatial.mode === "position"
        ? cue.spatial.position
        : undefined;
    if (!position) {
      events.push(
        this.createEvent("failed", cue.cueId, command, cue.busId, this.now(), [
          createAudioDiagnostic("spatial-target-missing", `Spatial cue ${cue.cueId} has no resolved position.`, "warning", true)
        ])
      );
      this.setPannerPosition(panner, {
        x: 0,
        y: 0,
        z: 0
      });
      return panner;
    }

    this.setPannerPosition(panner, position);
    return panner;
  }

  private setPannerPosition(panner: PannerNodeLike, position: AudioSpatialPosition): void {
    if (panner.setPosition) {
      panner.setPosition(position.x, position.y, position.z);
      return;
    }

    const time = this.context?.currentTime ?? 0;
    setParam(panner.positionX, position.x, time);
    setParam(panner.positionY, position.y, time);
    setParam(panner.positionZ, position.z, time);
  }

  private applyListener(listener: AudioListenerLike | undefined): void {
    if (!listener) {
      return;
    }

    if (listener.setPosition) {
      listener.setPosition(this.listener.position.x, this.listener.position.y, this.listener.position.z);
    } else {
      const time = this.context?.currentTime ?? 0;
      setParam(listener.positionX, this.listener.position.x, time);
      setParam(listener.positionY, this.listener.position.y, time);
      setParam(listener.positionZ, this.listener.position.z, time);
    }

    if (listener.setOrientation) {
      listener.setOrientation(
        this.listener.forward.x,
        this.listener.forward.y,
        this.listener.forward.z,
        this.listener.up.x,
        this.listener.up.y,
        this.listener.up.z
      );
      return;
    }

    const time = this.context?.currentTime ?? 0;
    setParam(listener.forwardX, this.listener.forward.x, time);
    setParam(listener.forwardY, this.listener.forward.y, time);
    setParam(listener.forwardZ, this.listener.forward.z, time);
    setParam(listener.upX, this.listener.up.x, time);
    setParam(listener.upY, this.listener.up.y, time);
    setParam(listener.upZ, this.listener.up.z, time);
  }

  private updateBusPlayback(command: AudioCommand, state: "playing" | "paused"): AudioCommandResult {
    const busId = command.busId ?? this.config.defaultBusId;
    const bus = this.getMutableBus(busId);
    if (!bus) {
      return this.fail(command, [this.unknownBus(busId)]);
    }

    let affected = 0;
    for (const active of this.activeCues.values()) {
      if (active.snapshot.busId === bus.busId && (active.snapshot.state === "playing" || active.snapshot.state === "paused")) {
        active.snapshot.state = state;
        affected += 1;
      }
    }

    const node = this.busNodes.get(bus.busId);
    if (node) {
      setParam(node.gain, state === "paused" ? 0 : this.effectiveBusGain(bus), this.context?.currentTime ?? 0);
    }

    return this.result("completed", command, {
      busId: bus.busId,
      affected,
      state
    });
  }

  private refreshBusGain(busId: AudioBusId): void {
    const bus = this.getMutableBus(busId);
    const node = this.busNodes.get(busId);
    if (!bus || !node) {
      return;
    }

    setParam(node.gain, this.effectiveBusGain(bus), this.context?.currentTime ?? 0);
  }

  private effectiveBusGain(bus: AudioBusSpec): number {
    if (this.config.preferences.muted || this.config.preferences.busMutes[bus.busId] || bus.muted) {
      return 0;
    }

    return clampUnitGain(bus.gain * (this.config.preferences.busVolumes[bus.busId] ?? 1) * this.config.preferences.masterVolume);
  }

  private fallback(command: AudioCommand, diagnostics: AudioDiagnostic[]): Promise<AudioCommandResult> | AudioCommandResult {
    const withFallback = [
      ...diagnostics,
      createAudioDiagnostic("silent-fallback", "Web Audio command was handled by silent fallback.", "info")
    ];

    if (command.type === "play") {
      return this.silentFallback.play(command).then((result) => ({
        ...result,
        diagnostics: [...withFallback, ...result.diagnostics]
      }));
    }

    if (command.type === "preload") {
      return this.silentFallback.preload(command).then((result) => ({
        ...result,
        diagnostics: [...withFallback, ...result.diagnostics]
      }));
    }

    return createAudioCommandResult("fallback", command, {
      diagnostics: withFallback,
      value: {
        lifecycle: this.lifecycle,
        silent: true
      }
    });
  }

  private result(
    status: "accepted" | "completed",
    command: AudioCommand,
    value: AudioJsonObject,
    diagnostics: AudioDiagnostic[] = [],
    events: AudioCueEvent[] = [],
    durationMs = 0
  ): AudioCommandResult {
    return createAudioCommandResult(status, command, {
      value,
      diagnostics,
      events,
      durationMs
    });
  }

  private fail(command: AudioCommand, diagnostics: AudioDiagnostic[]): AudioCommandResult {
    return createAudioCommandResult("failed", command, {
      diagnostics
    });
  }

  private createEvent(
    type: AudioCueEventType,
    cueId: string,
    command: AudioCommand,
    busId: AudioBusId,
    occurredAt: number,
    diagnostics: AudioDiagnostic[] = []
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

  private setLifecycle(lifecycle: AudioSystemConfig["lifecycle"]): void {
    this.state = lifecycle;
    this.config.lifecycle = lifecycle;
  }

  private getMutableBus(busId: AudioBusId): AudioBusSpec | undefined {
    return this.config.buses.find((bus) => bus.busId === busId);
  }

  private unknownBus(busId: AudioBusId): AudioDiagnostic {
    return createAudioDiagnostic("unknown-bus", `Audio bus ${busId} is not registered.`, "error", false, { busId });
  }

  private unsupportedDiagnostic(): AudioDiagnostic {
    return createAudioDiagnostic("unsupported-browser", "Browser audio output is not available in this environment.", "error", true);
  }
}

class MissingAudioAssetError extends Error {}
