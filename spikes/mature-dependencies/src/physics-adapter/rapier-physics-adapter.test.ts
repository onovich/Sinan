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
  const bodyId = overrides.bodyId ?? "body-rapier";
  const result = normalizePhysicsColliderSpec(
    {
      colliderId: "collider-rapier",
      bodyId,
      sceneId: "scene-rapier",
      shape: {
        type: "ball",
        radius: 0.25
      },
      ...overrides
    },
    new Set([bodyId])
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

  it("steps Rapier world with Sinan fixed-step policy and returns body transforms", async () => {
    const adapter = createRapierPhysicsAdapter();
    await adapter.createWorld(
      normalizePhysicsWorldConfig({
        worldId: "rapier-step-world",
        sceneId: "scene-rapier",
        gravity: {
          x: 0,
          y: -10,
          z: 0
        },
        fixedStep: {
          stepMs: 10,
          maxCatchUpSteps: 4,
          accumulatorMs: 0
        }
      })
    );
    await adapter.addBody(bodySpec({ bodyId: "falling-body", sleep: "prevent" }));
    await adapter.addCollider(colliderSpec({ bodyId: "falling-body", colliderId: "falling-collider" }));

    const result = await adapter.step({
      worldId: "rapier-step-world",
      deltaMs: 40,
      nowMs: 100
    });

    expect(result.status).toBe("success");
    expect(result.simulatedSteps).toBe(4);
    expect(result.remainingAccumulatorMs).toBe(0);
    expect(result.transforms[0]?.bodyId).toBe("falling-body");
    expect(result.transforms[0]?.transform.position.y).toBeLessThan(2);
  });

  it("clamps fixed-step catch-up and preserves remaining accumulator", async () => {
    const adapter = createRapierPhysicsAdapter();
    await adapter.createWorld(
      normalizePhysicsWorldConfig({
        worldId: "rapier-clamp-world",
        sceneId: "scene-rapier",
        fixedStep: {
          stepMs: 10,
          maxCatchUpSteps: 2,
          accumulatorMs: 0
        }
      })
    );
    await adapter.addBody(bodySpec({ bodyId: "clamped-body" }));

    const result = await adapter.step({
      worldId: "rapier-clamp-world",
      deltaMs: 55,
      nowMs: 100
    });

    expect(result.status).toBe("success");
    expect(result.simulatedSteps).toBe(2);
    expect(result.remainingAccumulatorMs).toBe(35);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("max-catch-up-clamped");
  });

  it("removes colliders when a body is removed", async () => {
    const adapter = createRapierPhysicsAdapter();
    await adapter.createWorld(worldConfig());
    await adapter.addBody(bodySpec());
    await adapter.addCollider(colliderSpec());

    const remove = await adapter.removeBody("body-rapier");
    const snapshot = await adapter.snapshot();

    expect(remove.status).toBe("success");
    expect(snapshot.bodies).toHaveLength(0);
    expect(snapshot.colliders).toHaveLength(0);
  });

  it("normalizes Rapier collision and trigger events to Sinan ids", async () => {
    const adapter = createRapierPhysicsAdapter();
    await adapter.createWorld(
      normalizePhysicsWorldConfig({
        worldId: "rapier-events-world",
        sceneId: "scene-rapier",
        fixedStep: {
          stepMs: 16.6667,
          maxCatchUpSteps: 1,
          accumulatorMs: 0
        }
      })
    );

    await adapter.addBody(
      bodySpec({
        bodyId: "body-ground",
        kind: "fixed",
        initialTransform: {
          position: {
            x: 0,
            y: -0.25,
            z: 0
          },
          rotation: {
            x: 0,
            y: 0,
            z: 0,
            w: 1
          }
        }
      })
    );
    await adapter.addCollider(
      colliderSpec({
        colliderId: "collider-ground",
        bodyId: "body-ground",
        shape: {
          type: "cuboid",
          halfExtents: {
            x: 2,
            y: 0.25,
            z: 2
          }
        }
      })
    );

    await adapter.addBody(
      bodySpec({
        bodyId: "body-trigger",
        kind: "fixed",
        initialTransform: {
          position: {
            x: 0,
            y: 0.75,
            z: 0
          },
          rotation: {
            x: 0,
            y: 0,
            z: 0,
            w: 1
          }
        }
      })
    );
    await adapter.addCollider(
      colliderSpec({
        colliderId: "collider-trigger",
        bodyId: "body-trigger",
        isTrigger: true,
        shape: {
          type: "cuboid",
          halfExtents: {
            x: 0.75,
            y: 0.25,
            z: 0.75
          }
        }
      })
    );

    await adapter.addBody(
      bodySpec({
        bodyId: "body-ball",
        sleep: "prevent",
        initialTransform: {
          position: {
            x: 0,
            y: 2.5,
            z: 0
          },
          rotation: {
            x: 0,
            y: 0,
            z: 0,
            w: 1
          }
        }
      })
    );
    await adapter.addCollider(colliderSpec({ colliderId: "collider-ball", bodyId: "body-ball" }));

    const events = [];
    for (let index = 0; index < 180; index += 1) {
      const result = await adapter.step({
        worldId: "rapier-events-world",
        deltaMs: 16.6667,
        nowMs: index * 16.6667
      });
      events.push(...result.events.events);
    }

    expect(events.some((event) => event.type === "trigger-enter")).toBe(true);
    expect(events.some((event) => event.type === "collision-start")).toBe(true);
    expect(events.every((event) => event.colliderAId && event.colliderBId && event.bodyAId && event.bodyBId)).toBe(true);
    expect(JSON.stringify(events)).not.toMatch(/rawHandle|RigidBody|ColliderDesc|@dimforge|wasm/i);
  });
});
