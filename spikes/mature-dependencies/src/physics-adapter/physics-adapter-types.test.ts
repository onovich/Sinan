import { describe, expect, test } from "vitest";
import {
  createPhysicsDiagnostic,
  createPhysicsResult,
  physicsDiagnosticCodes,
  physicsLifecycleStates,
  physicsResultStatuses,
  type PhysicsAdapter,
  type PhysicsBodySpec,
  type PhysicsColliderSpec,
  type PhysicsEventBatch,
  type PhysicsFixedStepPolicy,
  type PhysicsQueryResult,
  type PhysicsStepResult,
  type PhysicsWorldConfig
} from "./physics-adapter-types";

const identityRotation = {
  x: 0,
  y: 0,
  z: 0,
  w: 1
};

const originTransform = {
  position: {
    x: 0,
    y: 0,
    z: 0
  },
  rotation: identityRotation
};

const fixedStep: PhysicsFixedStepPolicy = {
  mode: "fixed-step",
  stepMs: 16.6667,
  maxCatchUpSteps: 4,
  accumulatorMs: 0,
  samplingPoint: "after-step"
};

const worldConfig: PhysicsWorldConfig = {
  worldId: "world:contract",
  sceneId: "scene:contract",
  gravity: {
    x: 0,
    y: -9.81,
    z: 0
  },
  unitScale: 1,
  fixedStep,
  diagnosticsLevel: "standard"
};

const bodySpec: PhysicsBodySpec = {
  bodyId: "body:crate",
  sceneId: "scene:contract",
  kind: "dynamic",
  massIntent: "auto",
  linearDamping: 0.05,
  angularDamping: 0.1,
  gravityScale: 1,
  initialTransform: originTransform,
  sleep: "allow"
};

const colliderSpec: PhysicsColliderSpec = {
  colliderId: "collider:crate",
  bodyId: "body:crate",
  sceneId: "scene:contract",
  shape: {
    type: "cuboid",
    halfExtents: {
      x: 0.5,
      y: 0.5,
      z: 0.5
    }
  },
  isTrigger: false,
  material: {
    friction: 0.7,
    restitution: 0.1
  },
  collision: {
    layer: "dynamic",
    mask: ["static", "trigger"]
  },
  query: {
    layer: "solid",
    mask: ["solid"]
  },
  localTransform: originTransform
};

describe("PhysicsAdapter contract types", () => {
  test("defines lifecycle states, result statuses, and diagnostic vocabulary required by RFC-006", () => {
    expect(physicsLifecycleStates).toEqual(["uninitialized", "ready", "degraded", "unsupported", "disposed"]);
    expect(physicsResultStatuses).toEqual([
      "success",
      "ignored",
      "invalid-spec",
      "unsupported",
      "wasm-failed",
      "query-miss",
      "disposed",
      "fallback"
    ]);
    expect(physicsDiagnosticCodes).toEqual(
      expect.arrayContaining([
        "unsupported-browser",
        "wasm-init-failed",
        "invalid-spec",
        "invalid-layer",
        "duplicate-id",
        "missing-body",
        "max-catch-up-clamped",
        "query-miss",
        "disposed-world",
        "fallback-used",
        "event-mapping-failed"
      ])
    );
  });

  test("keeps body, collider, fixed-step, and layer policy as Sinan-owned descriptor data", () => {
    expect(worldConfig.fixedStep).toMatchObject({
      mode: "fixed-step",
      maxCatchUpSteps: 4,
      samplingPoint: "after-step"
    });
    expect(bodySpec).toMatchObject({
      bodyId: "body:crate",
      kind: "dynamic",
      massIntent: "auto",
      sleep: "allow"
    });
    expect(colliderSpec).toMatchObject({
      colliderId: "collider:crate",
      bodyId: "body:crate",
      isTrigger: false,
      collision: {
        layer: "dynamic",
        mask: ["static", "trigger"]
      }
    });
  });

  test("describes step, event, and query result surfaces using only stable ids and world-space data", () => {
    const eventBatch: PhysicsEventBatch = {
      worldId: "world:contract",
      stepIndex: 1,
      events: [
        {
          eventId: "event:collision:1",
          type: "collision-start",
          bodyAId: "body:crate",
          bodyBId: "body:floor",
          colliderAId: "collider:crate",
          colliderBId: "collider:floor",
          point: {
            x: 0,
            y: 0,
            z: 0
          },
          normal: {
            x: 0,
            y: 1,
            z: 0
          },
          diagnostics: []
        }
      ],
      diagnostics: []
    };
    const step: PhysicsStepResult = {
      status: "success",
      ok: true,
      worldId: "world:contract",
      stepIndex: 1,
      simulatedSteps: 1,
      remainingAccumulatorMs: 0,
      transforms: [],
      events: eventBatch,
      diagnostics: []
    };
    const query: PhysicsQueryResult = {
      status: "success",
      ok: true,
      queryId: "query:ray",
      hit: {
        bodyId: "body:crate",
        colliderId: "collider:crate",
        point: {
          x: 0,
          y: 1,
          z: 0
        },
        normal: {
          x: 0,
          y: 1,
          z: 0
        },
        distance: 1
      },
      hits: [],
      diagnostics: []
    };

    expect(step.events.events[0]?.type).toBe("collision-start");
    expect(query.hit?.bodyId).toBe("body:crate");
    expect(JSON.stringify({ step, query })).not.toMatch(/rawHandle|RigidBody|ColliderDesc|Rapier|@dimforge|wasm/i);
  });

  test("normalizes diagnostic and result helper shapes", () => {
    const diagnostic = createPhysicsDiagnostic("query-miss", "Raycast did not hit any collider.", "info", false, {
      queryId: "query:ray"
    });
    const success = createPhysicsResult("success", {
      value: {
        bodyId: "body:crate"
      },
      diagnostics: [diagnostic]
    });
    const miss = createPhysicsResult("query-miss", {
      diagnostics: [diagnostic]
    });

    expect(success.ok).toBe(true);
    expect(success.value).toEqual({ bodyId: "body:crate" });
    expect(success.diagnostics[0]?.detail).toEqual({ queryId: "query:ray" });
    expect(miss.ok).toBe(false);
  });

  test("declares the adapter interface without importing candidate dependency types", () => {
    const adapterShape: Pick<
      PhysicsAdapter,
      | "boot"
      | "createWorld"
      | "addBody"
      | "addCollider"
      | "step"
      | "raycast"
      | "overlap"
      | "snapshot"
      | "dispose"
    > = {
      boot: async () => createPhysicsResult("success"),
      createWorld: async () => createPhysicsResult("success"),
      addBody: async () =>
        createPhysicsResult("success", {
          value: {
            bodyId: "body:crate"
          }
        }),
      addCollider: async () =>
        createPhysicsResult("success", {
          value: {
            colliderId: "collider:crate",
            bodyId: "body:crate"
          }
        }),
      step: async () => ({
        status: "success",
        ok: true,
        worldId: "world:contract",
        stepIndex: 0,
        simulatedSteps: 0,
        remainingAccumulatorMs: 0,
        transforms: [],
        events: {
          worldId: "world:contract",
          stepIndex: 0,
          events: [],
          diagnostics: []
        },
        diagnostics: []
      }),
      raycast: async () => ({
        status: "query-miss",
        ok: false,
        queryId: "query:ray",
        hits: [],
        diagnostics: []
      }),
      overlap: async () => ({
        status: "query-miss",
        ok: false,
        queryId: "query:overlap",
        hits: [],
        diagnostics: []
      }),
      snapshot: async () => ({
        lifecycle: "ready",
        world: worldConfig,
        bodies: [],
        colliders: [],
        diagnostics: []
      }),
      dispose: async () => createPhysicsResult("success")
    };

    expect(Object.keys(adapterShape).sort()).toEqual([
      "addBody",
      "addCollider",
      "boot",
      "createWorld",
      "dispose",
      "overlap",
      "raycast",
      "snapshot",
      "step"
    ]);
  });
});
