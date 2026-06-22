export type PhysicsJsonPrimitive = string | number | boolean | null;
export type PhysicsJsonValue = PhysicsJsonPrimitive | PhysicsJsonValue[] | { [key: string]: PhysicsJsonValue };
export type PhysicsJsonObject = { [key: string]: PhysicsJsonValue };

export const physicsLifecycleStates = ["uninitialized", "ready", "degraded", "unsupported", "disposed"] as const;

export type PhysicsLifecycleState = (typeof physicsLifecycleStates)[number];

export const physicsResultStatuses = [
  "success",
  "ignored",
  "invalid-spec",
  "unsupported",
  "wasm-failed",
  "query-miss",
  "disposed",
  "fallback"
] as const;

export type PhysicsResultStatus = (typeof physicsResultStatuses)[number];

export const physicsDiagnosticCodes = [
  "unsupported-browser",
  "wasm-init-failed",
  "invalid-spec",
  "invalid-layer",
  "duplicate-id",
  "missing-body",
  "missing-collider",
  "unknown-body",
  "unknown-collider",
  "max-catch-up-clamped",
  "query-miss",
  "disposed-world",
  "fallback-used",
  "step-failed",
  "event-mapping-failed"
] as const;

export type PhysicsDiagnosticCode = (typeof physicsDiagnosticCodes)[number];

export type PhysicsDiagnosticSeverity = "info" | "warning" | "error";

export interface PhysicsDiagnostic {
  code: PhysicsDiagnosticCode;
  severity: PhysicsDiagnosticSeverity;
  message: string;
  retryable: boolean;
  detail?: PhysicsJsonObject;
}

export interface PhysicsVector3 {
  x: number;
  y: number;
  z: number;
}

export interface PhysicsQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface PhysicsTransform {
  position: PhysicsVector3;
  rotation: PhysicsQuaternion;
}

export interface PhysicsMaterialIntent {
  friction: number;
  restitution: number;
  density?: number;
}

export interface PhysicsLayerMask {
  layer: string;
  mask: string[];
}

export type PhysicsBodyKind = "fixed" | "dynamic" | "kinematic";
export type PhysicsMassIntent = "auto" | "immovable" | "explicit";
export type PhysicsSleepPreference = "allow" | "prevent" | "start-asleep";

export interface PhysicsBodySpec {
  bodyId: string;
  sceneId: string;
  kind: PhysicsBodyKind;
  massIntent: PhysicsMassIntent;
  mass?: number;
  linearDamping: number;
  angularDamping: number;
  gravityScale: number;
  initialTransform: PhysicsTransform;
  sleep: PhysicsSleepPreference;
  userData?: PhysicsJsonObject;
}

export type PhysicsColliderShape =
  | {
      type: "cuboid";
      halfExtents: PhysicsVector3;
    }
  | {
      type: "ball";
      radius: number;
    }
  | {
      type: "capsule";
      halfHeight: number;
      radius: number;
    };

export interface PhysicsColliderSpec {
  colliderId: string;
  bodyId: string;
  sceneId: string;
  shape: PhysicsColliderShape;
  isTrigger: boolean;
  material: PhysicsMaterialIntent;
  collision: PhysicsLayerMask;
  query: PhysicsLayerMask;
  localTransform: PhysicsTransform;
  userData?: PhysicsJsonObject;
}

export type PhysicsStepSamplingPoint = "before-step" | "after-step";

export interface PhysicsFixedStepPolicy {
  mode: "fixed-step";
  stepMs: number;
  maxCatchUpSteps: number;
  accumulatorMs: number;
  samplingPoint: PhysicsStepSamplingPoint;
}

export interface PhysicsWorldConfig {
  worldId: string;
  sceneId: string;
  gravity: PhysicsVector3;
  unitScale: number;
  fixedStep: PhysicsFixedStepPolicy;
  diagnosticsLevel: "minimal" | "standard" | "verbose";
}

export interface PhysicsBodySnapshot {
  bodyId: string;
  sceneId: string;
  kind: PhysicsBodyKind;
  transform: PhysicsTransform;
  linearVelocity: PhysicsVector3;
  angularVelocity: PhysicsVector3;
  sleeping: boolean;
}

export interface PhysicsColliderSnapshot {
  colliderId: string;
  bodyId: string;
  sceneId: string;
  isTrigger: boolean;
  shape: PhysicsColliderShape;
  collision: PhysicsLayerMask;
  query: PhysicsLayerMask;
}

export type PhysicsEventType = "collision-start" | "collision-end" | "trigger-enter" | "trigger-exit" | "sensor-hit" | "diagnostic";

export interface PhysicsEvent {
  eventId: string;
  type: PhysicsEventType;
  bodyAId?: string;
  bodyBId?: string;
  colliderAId?: string;
  colliderBId?: string;
  point?: PhysicsVector3;
  normal?: PhysicsVector3;
  diagnostics: PhysicsDiagnostic[];
}

export interface PhysicsEventBatch {
  worldId: string;
  stepIndex: number;
  events: PhysicsEvent[];
  diagnostics: PhysicsDiagnostic[];
}

export interface PhysicsStepRequest {
  worldId: string;
  deltaMs: number;
  nowMs: number;
}

export interface PhysicsStepResult {
  status: PhysicsResultStatus;
  ok: boolean;
  worldId: string;
  stepIndex: number;
  simulatedSteps: number;
  remainingAccumulatorMs: number;
  transforms: PhysicsBodySnapshot[];
  events: PhysicsEventBatch;
  diagnostics: PhysicsDiagnostic[];
}

export interface PhysicsRaycastQuery {
  queryId: string;
  worldId: string;
  origin: PhysicsVector3;
  direction: PhysicsVector3;
  maxDistance: number;
  query: PhysicsLayerMask;
}

export interface PhysicsOverlapQuery {
  queryId: string;
  worldId: string;
  shape: PhysicsColliderShape;
  transform: PhysicsTransform;
  query: PhysicsLayerMask;
}

export interface PhysicsQueryHit {
  bodyId: string;
  colliderId: string;
  point: PhysicsVector3;
  normal?: PhysicsVector3;
  distance?: number;
}

export interface PhysicsQueryResult {
  status: PhysicsResultStatus;
  ok: boolean;
  queryId: string;
  hit?: PhysicsQueryHit;
  hits: PhysicsQueryHit[];
  diagnostics: PhysicsDiagnostic[];
}

export interface PhysicsSnapshot {
  lifecycle: PhysicsLifecycleState;
  world: PhysicsWorldConfig;
  bodies: PhysicsBodySnapshot[];
  colliders: PhysicsColliderSnapshot[];
  diagnostics: PhysicsDiagnostic[];
}

export interface PhysicsResult<TValue extends PhysicsJsonObject = PhysicsJsonObject> {
  status: PhysicsResultStatus;
  ok: boolean;
  value?: TValue;
  diagnostics: PhysicsDiagnostic[];
}

export interface PhysicsAdapter {
  readonly lifecycle: PhysicsLifecycleState;
  readonly config: PhysicsWorldConfig;

  boot(): Promise<PhysicsResult>;
  createWorld(config: PhysicsWorldConfig): Promise<PhysicsResult>;
  addBody(spec: PhysicsBodySpec): Promise<PhysicsResult<{ bodyId: string }>>;
  addCollider(spec: PhysicsColliderSpec): Promise<PhysicsResult<{ colliderId: string; bodyId: string }>>;
  removeBody(bodyId: string): Promise<PhysicsResult<{ bodyId: string }>>;
  removeCollider(colliderId: string): Promise<PhysicsResult<{ colliderId: string }>>;
  setBodyTransform(bodyId: string, transform: PhysicsTransform): Promise<PhysicsResult<{ bodyId: string }>>;
  setBodyVelocity(bodyId: string, linearVelocity: PhysicsVector3, angularVelocity: PhysicsVector3): Promise<PhysicsResult<{ bodyId: string }>>;
  applyBodyImpulse(bodyId: string, impulse: PhysicsVector3): Promise<PhysicsResult<{ bodyId: string }>>;
  step(request: PhysicsStepRequest): Promise<PhysicsStepResult>;
  raycast(query: PhysicsRaycastQuery): Promise<PhysicsQueryResult>;
  overlap(query: PhysicsOverlapQuery): Promise<PhysicsQueryResult>;
  snapshot(): Promise<PhysicsSnapshot>;
  dispose(): Promise<PhysicsResult>;
}

export function createPhysicsDiagnostic(
  code: PhysicsDiagnosticCode,
  message: string,
  severity: PhysicsDiagnosticSeverity = "error",
  retryable = false,
  detail?: PhysicsJsonObject
): PhysicsDiagnostic {
  return {
    code,
    severity,
    message,
    retryable,
    ...(detail ? { detail } : {})
  };
}

export function createPhysicsResult<TValue extends PhysicsJsonObject = PhysicsJsonObject>(
  status: PhysicsResultStatus,
  options: {
    value?: TValue;
    diagnostics?: PhysicsDiagnostic[];
  } = {}
): PhysicsResult<TValue> {
  return {
    status,
    ok: status === "success" || status === "ignored" || status === "fallback",
    value: options.value,
    diagnostics: options.diagnostics ?? []
  };
}
