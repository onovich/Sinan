import {
  createPhysicsDiagnostic,
  type PhysicsBodyKind,
  type PhysicsBodySpec,
  type PhysicsColliderShape,
  type PhysicsColliderSpec,
  type PhysicsDiagnostic,
  type PhysicsLayerMask,
  type PhysicsMaterialIntent,
  type PhysicsQuaternion,
  type PhysicsTransform,
  type PhysicsVector3,
  type PhysicsWorldConfig
} from "./physics-adapter-types";

export interface PhysicsBodySpecInput extends Partial<Omit<PhysicsBodySpec, "initialTransform">> {
  initialTransform?: Partial<PhysicsTransform>;
}

export interface PhysicsColliderSpecInput
  extends Partial<Omit<PhysicsColliderSpec, "shape" | "material" | "collision" | "query" | "localTransform">> {
  shape?: Partial<PhysicsColliderShape> & Record<string, unknown>;
  material?: Partial<PhysicsMaterialIntent>;
  collision?: Partial<PhysicsLayerMask>;
  query?: Partial<PhysicsLayerMask>;
  localTransform?: Partial<PhysicsTransform>;
}

export interface PhysicsSceneSpecInput {
  world?: Partial<Omit<PhysicsWorldConfig, "fixedStep">> & {
    fixedStep?: Partial<PhysicsWorldConfig["fixedStep"]>;
  };
  bodies?: PhysicsBodySpecInput[];
  colliders?: PhysicsColliderSpecInput[];
  allowedLayers?: string[];
}

export interface PhysicsNormalizedSceneSpec {
  world: PhysicsWorldConfig;
  bodies: PhysicsBodySpec[];
  colliders: PhysicsColliderSpec[];
}

export interface PhysicsNormalizationResult<TValue> {
  ok: boolean;
  value?: TValue;
  diagnostics: PhysicsDiagnostic[];
}

export const defaultPhysicsLayers = ["static", "dynamic", "trigger", "sensor", "character", "query"] as const;

const zeroVector: PhysicsVector3 = {
  x: 0,
  y: 0,
  z: 0
};

const identityRotation: PhysicsQuaternion = {
  x: 0,
  y: 0,
  z: 0,
  w: 1
};

const identityTransform: PhysicsTransform = {
  position: zeroVector,
  rotation: identityRotation
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeVector(input: Partial<PhysicsVector3> | undefined, fallback: PhysicsVector3 = zeroVector): PhysicsVector3 {
  return {
    x: isFiniteNumber(input?.x) ? input.x : fallback.x,
    y: isFiniteNumber(input?.y) ? input.y : fallback.y,
    z: isFiniteNumber(input?.z) ? input.z : fallback.z
  };
}

function normalizeQuaternion(input: Partial<PhysicsQuaternion> | undefined): PhysicsQuaternion {
  return {
    x: isFiniteNumber(input?.x) ? input.x : identityRotation.x,
    y: isFiniteNumber(input?.y) ? input.y : identityRotation.y,
    z: isFiniteNumber(input?.z) ? input.z : identityRotation.z,
    w: isFiniteNumber(input?.w) ? input.w : identityRotation.w
  };
}

function normalizeTransform(input: Partial<PhysicsTransform> | undefined): PhysicsTransform {
  return {
    position: normalizeVector(input?.position),
    rotation: normalizeQuaternion(input?.rotation)
  };
}

function invalidSpec(message: string, detail?: Record<string, string | number | boolean | null>): PhysicsDiagnostic {
  return createPhysicsDiagnostic("invalid-spec", message, "error", false, detail);
}

function invalidLayer(message: string, detail?: Record<string, string | number | boolean | null>): PhysicsDiagnostic {
  return createPhysicsDiagnostic("invalid-layer", message, "error", false, detail);
}

function duplicateId(kind: "body" | "collider", id: string): PhysicsDiagnostic {
  return createPhysicsDiagnostic("duplicate-id", `Duplicate physics ${kind} id ${id}.`, "error", false, {
    kind,
    id
  });
}

function layerAllowed(layer: string | undefined, allowedLayers: Set<string>): layer is string {
  return typeof layer === "string" && layer.length > 0 && allowedLayers.has(layer);
}

export function normalizePhysicsLayerMask(
  input: Partial<PhysicsLayerMask> | undefined,
  fallbackLayer: string,
  allowedLayerValues: string[] = [...defaultPhysicsLayers]
): PhysicsNormalizationResult<PhysicsLayerMask> {
  const allowedLayers = new Set(allowedLayerValues);
  const diagnostics: PhysicsDiagnostic[] = [];
  const layer = input?.layer ?? fallbackLayer;
  const mask = input?.mask ?? allowedLayerValues;

  if (!layerAllowed(layer, allowedLayers)) {
    diagnostics.push(invalidLayer(`Physics layer ${String(layer)} is not allowed.`, { layer: String(layer) }));
  }

  const invalidMaskEntry = mask.find((entry) => !layerAllowed(entry, allowedLayers));
  if (invalidMaskEntry) {
    diagnostics.push(invalidLayer(`Physics mask layer ${invalidMaskEntry} is not allowed.`, { layer: invalidMaskEntry }));
  }

  return {
    ok: diagnostics.length === 0,
    value:
      diagnostics.length === 0
        ? {
            layer,
            mask: [...mask]
          }
        : undefined,
    diagnostics
  };
}

export function normalizePhysicsWorldConfig(input: PhysicsSceneSpecInput["world"] = {}): PhysicsWorldConfig {
  const fixedStep = input.fixedStep;
  const stepMs = fixedStep?.stepMs;
  const maxCatchUpSteps = fixedStep?.maxCatchUpSteps;
  const accumulatorMs = fixedStep?.accumulatorMs;

  return {
    worldId: input.worldId ?? "physics-world",
    sceneId: input.sceneId ?? "physics-scene",
    gravity: normalizeVector(input.gravity, {
      x: 0,
      y: -9.81,
      z: 0
    }),
    unitScale: isFiniteNumber(input.unitScale) && input.unitScale > 0 ? input.unitScale : 1,
    fixedStep: {
      mode: "fixed-step",
      stepMs: isFiniteNumber(stepMs) && stepMs > 0 ? stepMs : 16.6667,
      maxCatchUpSteps: Number.isInteger(maxCatchUpSteps) && maxCatchUpSteps !== undefined && maxCatchUpSteps > 0 ? maxCatchUpSteps : 4,
      accumulatorMs: isFiniteNumber(accumulatorMs) && accumulatorMs >= 0 ? accumulatorMs : 0,
      samplingPoint: fixedStep?.samplingPoint ?? "after-step"
    },
    diagnosticsLevel: input.diagnosticsLevel ?? "standard"
  };
}

export function normalizePhysicsBodySpec(input: PhysicsBodySpecInput): PhysicsNormalizationResult<PhysicsBodySpec> {
  const diagnostics: PhysicsDiagnostic[] = [];
  const bodyId = input.bodyId;
  const sceneId = input.sceneId ?? "physics-scene";
  const kind: PhysicsBodyKind = input.kind ?? "dynamic";

  if (!bodyId) {
    diagnostics.push(invalidSpec("Physics body requires bodyId."));
  }

  if (kind === "fixed" && input.mass !== undefined) {
    diagnostics.push(invalidSpec("Fixed physics bodies must not declare mass.", { bodyId: bodyId ?? "<missing>" }));
  }

  const massIntent = kind === "fixed" ? "immovable" : input.massIntent ?? "auto";
  if (massIntent === "explicit" && !(isFiniteNumber(input.mass) && input.mass > 0)) {
    diagnostics.push(invalidSpec("Explicit mass intent requires positive mass.", { bodyId: bodyId ?? "<missing>" }));
  }

  return {
    ok: diagnostics.length === 0,
    value:
      diagnostics.length === 0
        ? {
            bodyId: bodyId as string,
            sceneId,
            kind,
            massIntent,
            ...(isFiniteNumber(input.mass) ? { mass: input.mass } : {}),
            linearDamping: isFiniteNumber(input.linearDamping) && input.linearDamping >= 0 ? input.linearDamping : 0,
            angularDamping: isFiniteNumber(input.angularDamping) && input.angularDamping >= 0 ? input.angularDamping : 0,
            gravityScale: isFiniteNumber(input.gravityScale) ? input.gravityScale : kind === "fixed" ? 0 : 1,
            initialTransform: normalizeTransform(input.initialTransform),
            sleep: input.sleep ?? "allow",
            ...(input.userData ? { userData: input.userData } : {})
          }
        : undefined,
    diagnostics
  };
}

function normalizeShape(input: PhysicsColliderSpecInput["shape"]): PhysicsNormalizationResult<PhysicsColliderShape> {
  if (!input?.type) {
    return {
      ok: false,
      diagnostics: [invalidSpec("Physics collider requires a shape type.")]
    };
  }

  if (input.type === "cuboid") {
    return {
      ok: true,
      value: {
        type: "cuboid",
        halfExtents: normalizeVector(input.halfExtents as Partial<PhysicsVector3> | undefined, {
          x: 0.5,
          y: 0.5,
          z: 0.5
        })
      },
      diagnostics: []
    };
  }

  if (input.type === "ball") {
    const radius = input.radius;
    return isFiniteNumber(radius) && radius > 0
      ? {
          ok: true,
          value: {
            type: "ball",
            radius
          },
          diagnostics: []
        }
      : {
          ok: false,
          diagnostics: [invalidSpec("Ball collider requires positive radius.")]
        };
  }

  if (input.type === "capsule") {
    const halfHeight = input.halfHeight;
    const radius = input.radius;
    return isFiniteNumber(halfHeight) && halfHeight > 0 && isFiniteNumber(radius) && radius > 0
      ? {
          ok: true,
          value: {
            type: "capsule",
            halfHeight,
            radius
          },
          diagnostics: []
        }
      : {
          ok: false,
          diagnostics: [invalidSpec("Capsule collider requires positive halfHeight and radius.")]
        };
  }

  return {
    ok: false,
    diagnostics: [invalidSpec(`Physics collider shape ${String(input.type)} is not supported.`, { shape: String(input.type) })]
  };
}

export function normalizePhysicsColliderSpec(
  input: PhysicsColliderSpecInput,
  bodyIds: Set<string>,
  allowedLayerValues: string[] = [...defaultPhysicsLayers]
): PhysicsNormalizationResult<PhysicsColliderSpec> {
  const diagnostics: PhysicsDiagnostic[] = [];
  const colliderId = input.colliderId;
  const bodyId = input.bodyId;
  const sceneId = input.sceneId ?? "physics-scene";

  if (!colliderId) {
    diagnostics.push(invalidSpec("Physics collider requires colliderId."));
  }

  if (!bodyId) {
    diagnostics.push(createPhysicsDiagnostic("missing-body", "Physics collider requires bodyId."));
  } else if (!bodyIds.has(bodyId)) {
    diagnostics.push(createPhysicsDiagnostic("missing-body", `Physics collider ${colliderId ?? "<missing>"} references missing body ${bodyId}.`, "error", false, {
      colliderId: colliderId ?? "<missing>",
      bodyId
    }));
  }

  const shape = normalizeShape(input.shape);
  diagnostics.push(...shape.diagnostics);

  const collision = normalizePhysicsLayerMask(input.collision, input.isTrigger ? "trigger" : "dynamic", allowedLayerValues);
  diagnostics.push(...collision.diagnostics);

  const query = normalizePhysicsLayerMask(input.query, "query", allowedLayerValues);
  diagnostics.push(...query.diagnostics);

  return {
    ok: diagnostics.length === 0,
    value:
      diagnostics.length === 0 && shape.value && collision.value && query.value
        ? {
            colliderId: colliderId as string,
            bodyId: bodyId as string,
            sceneId,
            shape: shape.value,
            isTrigger: input.isTrigger ?? false,
            material: {
              friction: isFiniteNumber(input.material?.friction) ? input.material.friction : 0.7,
              restitution: isFiniteNumber(input.material?.restitution) ? input.material.restitution : 0,
              ...(isFiniteNumber(input.material?.density) ? { density: input.material.density } : {})
            },
            collision: collision.value,
            query: query.value,
            localTransform: normalizeTransform(input.localTransform ?? identityTransform),
            ...(input.userData ? { userData: input.userData } : {})
          }
        : undefined,
    diagnostics
  };
}

export function normalizePhysicsSceneSpec(input: PhysicsSceneSpecInput = {}): PhysicsNormalizationResult<PhysicsNormalizedSceneSpec> {
  const diagnostics: PhysicsDiagnostic[] = [];
  const world = normalizePhysicsWorldConfig(input.world);
  const allowedLayers = input.allowedLayers ?? [...defaultPhysicsLayers];
  const bodyResults = (input.bodies ?? []).map(normalizePhysicsBodySpec);
  const bodies: PhysicsBodySpec[] = [];
  const bodyIds = new Set<string>();

  for (const result of bodyResults) {
    diagnostics.push(...result.diagnostics);
    if (!result.value) {
      continue;
    }

    if (bodyIds.has(result.value.bodyId)) {
      diagnostics.push(duplicateId("body", result.value.bodyId));
      continue;
    }

    bodyIds.add(result.value.bodyId);
    bodies.push(result.value);
  }

  const colliders: PhysicsColliderSpec[] = [];
  const colliderIds = new Set<string>();
  for (const inputCollider of input.colliders ?? []) {
    const result = normalizePhysicsColliderSpec(inputCollider, bodyIds, allowedLayers);
    diagnostics.push(...result.diagnostics);
    if (!result.value) {
      continue;
    }

    if (colliderIds.has(result.value.colliderId)) {
      diagnostics.push(duplicateId("collider", result.value.colliderId));
      continue;
    }

    colliderIds.add(result.value.colliderId);
    colliders.push(result.value);
  }

  return {
    ok: diagnostics.length === 0,
    value:
      diagnostics.length === 0
        ? {
            world,
            bodies,
            colliders
          }
        : undefined,
    diagnostics
  };
}
