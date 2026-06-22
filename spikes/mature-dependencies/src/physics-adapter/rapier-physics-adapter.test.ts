import { describe, expect, it } from "vitest";
import { createRapierPhysicsAdapter } from "./rapier-physics-adapter";
import {
  normalizePhysicsBodySpec,
  normalizePhysicsColliderSpec,
  normalizePhysicsWorldConfig
} from "./physics-spec-normalizer";
import type { PhysicsBodySpec, PhysicsColliderSpec } from "./physics-adapter-types";

function worldConfig() {
  return normalizePhysicsWorldConfig({
    worldId: "rapier-test-world",
    sceneId: "scene-rapier",
    fixedStep: {
      stepMs: 16.6667,
      maxCatchUpSteps: 4,
      accumulatorMs: 0
    }
  });
}

function bodySpec(overrides: Partial<PhysicsBodySpec> = {}): PhysicsBodySpec {
  const result = normalizePhysicsBodySpec({
    bodyId: "body-rapier",
    sceneId: "scene-rapier",
    kind: "dynamic",
    initialTransform: {
      position: {
        x: 0,
        y: 2,
        z: 0
      },
      rotation: {
        x: 0,
        y: 0,
        z: 0,
        w: 1
      }
    },
    ...overrides
  });
  expect(result.ok).toBe(true);
  expect(result.value).toBeDefined();
  return result.value as PhysicsBodySpec;
}

function colliderSpec(overrides: Partial<PhysicsColliderSpec> = {}): PhysicsColliderSpec {
  const result = normalizePhysicsColliderSpec(
    {
      colliderId: "collider-rapier",
      bodyId: "body-rapier",
      sceneId: "scene-rapier",
      shape: {
        type: "ball",
        radius: 0.25
      },
      ...overrides
    },
    new Set(["body-rapier"])
  );
  expect(result.ok).toBe(true);
  expect(result.value).toBeDefined();
  return result.value as PhysicsColliderSpec;
}

describe("RapierPhysicsAdapter lifecycle", () => {
  it("initializes Rapier WASM, creates a world, and exposes only Sinan contract snapshots", async () => {
    const adapter = createRapierPhysicsAdapter();

    const boot = await adapter.boot();
    const world = await adapter.createWorld(worldConfig());
    const addBody = await adapter.addBody(bodySpec());
    const addCollider = await adapter.addCollider(colliderSpec());
    const snapshot = await adapter.snapshot();

    expect(boot.status).toBe("success");
    expect(boot.value?.packageName).toBe("@dimforge/rapier3d-compat");
    expect(world.status).toBe("success");
    expect(addBody.status).toBe("success");
    expect(addCollider.status).toBe("success");
    expect(adapter.lifecycle).toBe("ready");
    expect(snapshot.bodies).toHaveLength(1);
    expect(snapshot.colliders).toHaveLength(1);
    expect(snapshot.bodies[0]?.bodyId).toBe("body-rapier");
    expect(snapshot.colliders[0]?.colliderId).toBe("collider-rapier");
    expect(JSON.stringify(snapshot)).not.toMatch(/rawHandle|RigidBody|ColliderDesc|@dimforge|wasm/i);
  });

  it("keeps dependency handles internal when validating duplicate and missing ids", async () => {
    const adapter = createRapierPhysicsAdapter();
    await adapter.createWorld(worldConfig());
    await adapter.addBody(bodySpec());

    const duplicateBody = await adapter.addBody(bodySpec());
    const missingBodyCollider = await adapter.addCollider({
      ...colliderSpec(),
      colliderId: "orphan-collider",
      bodyId: "missing-body"
    });

    expect(duplicateBody.status).toBe("invalid-spec");
    expect(duplicateBody.diagnostics[0]?.code).toBe("duplicate-id");
    expect(JSON.stringify(duplicateBody.diagnostics)).not.toMatch(/rawHandle|RigidBody|ColliderDesc|@dimforge|wasm/i);
    expect(missingBodyCollider.status).toBe("invalid-spec");
    expect(missingBodyCollider.diagnostics[0]?.code).toBe("missing-body");
  });

  it("requires world creation before body creation and blocks mutations after dispose", async () => {
    const adapter = createRapierPhysicsAdapter();

    const beforeWorld = await adapter.addBody(bodySpec());
    await adapter.createWorld(worldConfig());
    const dispose = await adapter.dispose();
    const afterDispose = await adapter.addBody(bodySpec({ bodyId: "body-after-dispose" }));
    const snapshot = await adapter.snapshot();

    expect(beforeWorld.status).toBe("invalid-spec");
    expect(beforeWorld.diagnostics[0]?.code).toBe("invalid-spec");
    expect(dispose.status).toBe("success");
    expect(afterDispose.status).toBe("disposed");
    expect(snapshot.lifecycle).toBe("disposed");
    expect(snapshot.bodies).toHaveLength(0);
  });
});
