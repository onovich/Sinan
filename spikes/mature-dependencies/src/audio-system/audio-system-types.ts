export type AudioJsonPrimitive = string | number | boolean | null;
export type AudioJsonValue = AudioJsonPrimitive | AudioJsonValue[] | { [key: string]: AudioJsonValue };
export type AudioJsonObject = { [key: string]: AudioJsonValue };

export const audioLifecycleStates = ["unsupported", "locked", "running", "suspended", "degraded", "silent", "disposed"] as const;

export type AudioLifecycleState = (typeof audioLifecycleStates)[number];

export const audioCommandStatuses = ["accepted", "queued", "ignored", "failed", "fallback", "completed"] as const;

export type AudioCommandStatus = (typeof audioCommandStatuses)[number];

export const audioDiagnosticCodes = [
  "unsupported-browser",
  "locked-context",
  "unlock-denied",
  "missing-asset",
  "decode-failure",
  "autoplay-denied",
  "interrupted-cue",
  "latency-warning",
  "spatial-target-missing",
  "silent-fallback",
  "disposed-scene",
  "invalid-cue",
  "unknown-bus",
  "invalid-gain",
  "invalid-duration"
] as const;

export type AudioDiagnosticCode = (typeof audioDiagnosticCodes)[number];

export type AudioDiagnosticSeverity = "info" | "warning" | "error";

export interface AudioDiagnostic {
  code: AudioDiagnosticCode;
  severity: AudioDiagnosticSeverity;
  message: string;
  retryable: boolean;
  detail?: AudioJsonObject;
}

export const audioBusIds = ["master", "music", "effects", "ambience", "dialogue"] as const;

export type DefaultAudioBusId = (typeof audioBusIds)[number];
export type AudioBusId = DefaultAudioBusId | (string & {});

export interface AudioBusSpec {
  busId: AudioBusId;
  parentBusId?: AudioBusId;
  gain: number;
  muted: boolean;
}

export interface AudioTimelineBinding {
  timelineId: string;
  trackId?: string;
  bindingId?: string;
  blocking: "none" | "until-started" | "until-complete";
  completionPolicy: "on-ended" | "declared-duration" | "immediate" | "manual";
}

export interface AudioSpatialPosition {
  x: number;
  y: number;
  z: number;
}

export interface AudioSpatialIntent {
  mode: "none" | "position" | "entity";
  entityId?: string;
  position?: AudioSpatialPosition;
  distanceModel?: "linear" | "inverse" | "exponential";
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
}

export interface AudioCueSpec {
  cueId: string;
  assetId: string;
  busId: AudioBusId;
  gain: number;
  loop: boolean;
  declaredDurationMs: number;
  timeline?: AudioTimelineBinding;
  spatial: AudioSpatialIntent;
}

export interface AudioListenerState {
  position: AudioSpatialPosition;
  forward: AudioSpatialPosition;
  up: AudioSpatialPosition;
}

export interface AudioUserPreferenceState {
  masterVolume: number;
  muted: boolean;
  busVolumes: Record<string, number>;
  busMutes: Record<string, boolean>;
  captionsEnabled: boolean;
}

export interface AudioSystemConfig {
  adapterId: string;
  lifecycle: AudioLifecycleState;
  sampleRatePreference?: number;
  unlockPolicy: "require-user-gesture" | "attempt-on-boot" | "silent-until-unlocked";
  defaultBusId: AudioBusId;
  buses: AudioBusSpec[];
  preferences: AudioUserPreferenceState;
  diagnosticsLevel: "minimal" | "standard" | "verbose";
}

export type AudioCommandType =
  | "unlock"
  | "preload"
  | "play"
  | "stop"
  | "pause-bus"
  | "resume-bus"
  | "set-bus-gain"
  | "set-bus-muted"
  | "set-listener-transform"
  | "dispose-scene";

export interface AudioCommand<TPayload extends AudioJsonObject = AudioJsonObject> {
  commandId: string;
  type: AudioCommandType;
  submittedAt: number;
  cueId?: string;
  assetId?: string;
  busId?: AudioBusId;
  sceneId?: string;
  payload: TPayload;
}

export interface AudioCommandResult<TValue extends AudioJsonObject = AudioJsonObject> {
  commandId: string;
  type: AudioCommandType;
  status: AudioCommandStatus;
  ok: boolean;
  cueId?: string;
  busId?: AudioBusId;
  value?: TValue;
  diagnostics: AudioDiagnostic[];
  events: AudioCueEvent[];
  durationMs: number;
}

export type AudioCueEventType = "queued" | "started" | "ended" | "looped" | "interrupted" | "failed" | "completed";

export interface AudioCueEvent {
  eventId: string;
  cueId: string;
  commandId?: string;
  type: AudioCueEventType;
  occurredAt: number;
  busId: AudioBusId;
  diagnostics: AudioDiagnostic[];
}

export interface AudioCueSnapshot {
  cueId: string;
  assetId: string;
  busId: AudioBusId;
  state: "queued" | "playing" | "paused" | "ended" | "failed" | "interrupted";
  gain: number;
  loop: boolean;
  timeline?: AudioTimelineBinding;
  spatial: AudioSpatialIntent;
}

export interface AudioSnapshot {
  lifecycle: AudioLifecycleState;
  buses: AudioBusSpec[];
  cues: AudioCueSnapshot[];
  listener: AudioListenerState;
  preferences: AudioUserPreferenceState;
  diagnostics: AudioDiagnostic[];
}

export interface AudioSystem {
  readonly config: AudioSystemConfig;
  readonly lifecycle: AudioLifecycleState;

  boot(): Promise<AudioCommandResult>;
  unlock(command: AudioCommand): Promise<AudioCommandResult>;
  preload(command: AudioCommand): Promise<AudioCommandResult>;
  play(command: AudioCommand): Promise<AudioCommandResult>;
  stop(command: AudioCommand): Promise<AudioCommandResult>;
  pauseBus(command: AudioCommand): Promise<AudioCommandResult>;
  resumeBus(command: AudioCommand): Promise<AudioCommandResult>;
  setBusGain(command: AudioCommand): Promise<AudioCommandResult>;
  setBusMuted(command: AudioCommand): Promise<AudioCommandResult>;
  setListenerTransform(command: AudioCommand): Promise<AudioCommandResult>;
  disposeSceneAudio(command: AudioCommand): Promise<AudioCommandResult>;
  snapshot(): Promise<AudioSnapshot>;
}

export function createAudioDiagnostic(
  code: AudioDiagnosticCode,
  message: string,
  severity: AudioDiagnosticSeverity = "error",
  retryable = false,
  detail?: AudioJsonObject
): AudioDiagnostic {
  return {
    code,
    severity,
    message,
    retryable,
    ...(detail ? { detail } : {})
  };
}

export function createAudioCommandResult<TValue extends AudioJsonObject = AudioJsonObject>(
  status: AudioCommandStatus,
  command: Pick<AudioCommand, "commandId" | "type" | "cueId" | "busId">,
  options: {
    value?: TValue;
    diagnostics?: AudioDiagnostic[];
    events?: AudioCueEvent[];
    durationMs?: number;
  } = {}
): AudioCommandResult<TValue> {
  return {
    commandId: command.commandId,
    type: command.type,
    status,
    ok: status === "accepted" || status === "queued" || status === "completed" || status === "fallback",
    cueId: command.cueId,
    busId: command.busId,
    value: options.value,
    diagnostics: options.diagnostics ?? [],
    events: options.events ?? [],
    durationMs: options.durationMs ?? 0
  };
}
