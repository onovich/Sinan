import { describe, expect, it } from "vitest";
import { createFakePhysicsAdapter } from "./fake-physics-adapter";
import {
  normalizePhysicsBodySpec,
  normalizePhysicsColliderSpec,
  normalizePhysicsWorldConfig
} from "./physics-spec-normalizer";
import type { PhysicsBodySpec, PhysicsColliderSpec, PhysicsTransform } from "./physics-adapter-types";

const identityTransform: PhysicsTransform = {
  position: {
    x: 0,
    y: 0,
    z: 0
  },
  rotation: {
    x: 0,
    y: 0,
    z: 0,
    w: 1
  }
};

function bodySpec(overrides: Partial<PhysicsBodySpec> = {}): PhysicsBodySpec {
  const result = normalizePhysicsBodySpec({
    bodyId: "body-player",
    sceneId: "scene-a",
    initialTransform: identityTransform,
    ...overrides
  });
  expect(result.ok).toBe(true);
  expect(result.value).toBeDefined();
  return result.value as PhysicsBodySpec;
}

function colliderSpec(overrides: Partial<PhysicsColliderSpec> = {}): PhysicsColliderSpec {
  const result = normalizePhysicsColliderSpec(
    {
      colliderId: "collider-player",
      bodyId: "body-player",
      sceneId: "scene-a",
      shape: {
        type: "cuboid",
        halfExtents: {
          x: 0.5,
          y: 1,
          z: 0.5
        }
      },
      ...overrides
    },
    new Set(["body-player"])
  );
  expect(result.ok).toBe(true);
  expect(result.value).toBeDefined();
  return result.value as PhysicsColliderSpec;
}

describe("FakePhysicsAdapter", () => {
  it("boots as degraded fallback without exposing dependency-owned objects", async () => {
    const adapter = createFakePhysicsAdapter();

    const result = await adapter.boot();
    const snapshot = await adapter.snapshot();

    expect(result.status).toBe("fallback");
    expect(result.ok).toBe(true);
    expect(adapter.lifecycle).toBe("degraded");
    expect(snapshot.lifecycle).toBe("degraded");
    expect(JSON.stringify(snapshot)).not.toMatch(/Rapier|RigidBody|ColliderDesc|rawHandle|wasm/i);
    expect(snapshot.diagnostics.map((diagnostic) => diagnostic.code)).toContain("fallback-used");
  });

  it("stores Sinan body and collider ids in snapshots", async () => {
    const adapter = createFakePhysicsAdapter();
    const body = bodySpec();
    const collider = colliderSpec();

    await adapter.boot();
    const addBody = await adapter.addBody(body);
    const addCollider = await adapter.addCollider(collider);
    const snapshot = await adapter.snapshot();

    expect(addBody.status).toBe("fallback");
    expect(addCollider.status).toBe("fallback");
    expect(snapshot.bodies).toHaveLength(1);
    expect(snapshot.colliders).toHaveLength(1);
    expect(snapshot.bodies[0]?.bodyId).toBe("body-player");
    expect(snapshot.colliders[0]?.colliderId).toBe("collider-player");
    expect(snapshot.colliders[0]?.bodyId).toBe("body-player");
  });

  it("runs deterministic fixed-step fallback and clamps catch-up", async () => {
    const world = normalizePhysicsWorldConfig({
      worldId: "world-fixed",
      sceneId: "scene-a",
      fixedStep: {
        stepMs: 10,
        maxCatchUpSteps: 2,
        accumulatorMs: 0
      }
    });
    const adapter = createFakePhysicsAdapter({ config: world });
    await adapter.boot();
    await adapter.addBody(bodySpec({ bodyId: "body-player", kind: "dynamic" }));
    await adapter.setBodyVelocity(
      "body-player",
      {
        x: 10,
        y: 0,
        z: 0
      },
      {
        x: 0,
        y: 0,
        z: 0
      }
    );

    const result = await adapter.step({
      worldId: "world-fixed",
      deltaMs: 35,
      nowMs: 100
    });

    expect(result.status).toBe("fallback");
    expect(result.simulatedSteps).toBe(2);
    expect(result.stepIndex).toBe(2);
    expect(result.remainingAccumulatorMs).toBe(15);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("max-catch-up-clamped");
    expect(result.transforms[0]?.transform.position.x).toBeCloseTo(0.2);
  });

  it("rejects duplicate ids, missing bodies, and unknown body updates with stable diagnostics", async () => {
    const adapter = createFakePhysicsAdapter();
    await adapter.boot();
    await adapter.addBody(bodySpec());

    const duplicateBody = await adapter.addBody(bodySpec());
    const missingBodyCollider = await adapter.addCollider({
      ...colliderSpec(),
      colliderId: "orphan-collider",
      bodyId: "missing-body"
    });
    const unknownUpdate = await adapter.setBodyTransform("missing-body", identityTransform);

    expect(duplicateBody.status).toBe("invalid-spec");
    expect(duplicateBody.diagnostics[0]?.code).toBe("duplicate-id");
    expect(missingBodyCollider.status).toBe("invalid-spec");
    expect(missingBodyCollider.diagnostics[0]?.code).toBe("missing-body");
    expect(unknownUpdate.status).toBe("invalid-spec");
    expect(unknownUpdate.diagnostics[0]?.code).toBe("unknown-body");
  });

  it("disposes stored scene state and blocks later mutations", async () => {
    const adapter = createFakePhysicsAdapter();
    await adapter.boot();
    await adapter.addBody(bodySpec());

    const dispose = await adapter.dispose();
    const afterDispose = await adapter.addBody(bodySpec({ bodyId: "body-after-dispose" }));
    const snapshot = await adapter.snapshot();

    expect(dispose.status).toBe("success");
    expect(adapter.lifecycle).toBe("disposed");
    expect(afterDispose.status).toBe("disposed");
    expect(snapshot.bodies).toHaveLength(0);
    expect(snapshot.lifecycle).toBe("disposed");
  });
});
