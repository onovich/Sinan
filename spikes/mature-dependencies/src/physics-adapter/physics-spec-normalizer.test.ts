import { describe, expect, test } from "vitest";
import {
  defaultPhysicsLayers,
  normalizePhysicsBodySpec,
  normalizePhysicsColliderSpec,
  normalizePhysicsLayerMask,
  normalizePhysicsSceneSpec
} from "./physics-spec-normalizer";

describe("physics spec normalizer", () => {
  test("normalizes world, body, collider, layer, mask, material, and transform policy", () => {
    const normalized = normalizePhysicsSceneSpec({
      world: {
        worldId: "world:fixture",
        sceneId: "scene:fixture",
        fixedStep: {
          stepMs: 8,
          maxCatchUpSteps: 2,
          samplingPoint: "before-step"
        }
      },
      bodies: [
        {
          bodyId: "body:crate",
          sceneId: "scene:fixture",
          kind: "dynamic",
          initialTransform: {
            position: {
              x: 1,
              y: 2,
              z: 3
            }
          }
        }
      ],
      colliders: [
        {
          colliderId: "collider:crate",
          bodyId: "body:crate",
          sceneId: "scene:fixture",
          shape: {
            type: "cuboid",
            halfExtents: {
              x: 0.5,
              y: 0.75,
              z: 1
            }
          },
          material: {
            friction: 0.3,
            restitution: 0.1
          },
          collision: {
            layer: "dynamic",
            mask: ["static", "trigger"]
          },
          query: {
            layer: "solid",
            mask: ["solid"]
          }
        }
      ],
      allowedLayers: [...defaultPhysicsLayers, "solid"]
    });

    expect(normalized.ok).toBe(true);
    expect(normalized.value?.world.fixedStep).toMatchObject({
      mode: "fixed-step",
      stepMs: 8,
      maxCatchUpSteps: 2,
      samplingPoint: "before-step"
    });
    expect(normalized.value?.bodies[0]).toMatchObject({
      bodyId: "body:crate",
      kind: "dynamic",
      massIntent: "auto",
      gravityScale: 1,
      initialTransform: {
        position: {
          x: 1,
          y: 2,
          z: 3
        }
      }
    });
    expect(normalized.value?.colliders[0]).toMatchObject({
      colliderId: "collider:crate",
      bodyId: "body:crate",
      shape: {
        type: "cuboid"
      },
      collision: {
        layer: "dynamic",
        mask: ["static", "trigger"]
      },
      query: {
        layer: "solid",
        mask: ["solid"]
      }
    });
  });

  test("accepts an empty scene and emits no fake Rapier-owned details", () => {
    const normalized = normalizePhysicsSceneSpec();

    expect(normalized.ok).toBe(true);
    expect(normalized.value?.bodies).toEqual([]);
    expect(normalized.value?.colliders).toEqual([]);
    expect(JSON.stringify(normalized)).not.toMatch(/RigidBody|ColliderDesc|Rapier|@dimforge|rawHandle|wasm/i);
  });

  test("returns structured diagnostics for duplicate ids", () => {
    const normalized = normalizePhysicsSceneSpec({
      bodies: [
        {
          bodyId: "body:duplicate"
        },
        {
          bodyId: "body:duplicate"
        }
      ],
      colliders: [
        {
          colliderId: "collider:duplicate",
          bodyId: "body:duplicate",
          shape: {
            type: "ball",
            radius: 1
          }
        },
        {
          colliderId: "collider:duplicate",
          bodyId: "body:duplicate",
          shape: {
            type: "ball",
            radius: 1
          }
        }
      ]
    });

    expect(normalized.ok).toBe(false);
    expect(normalized.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["duplicate-id", "duplicate-id"]);
    expect(normalized.diagnostics.map((diagnostic) => diagnostic.detail?.kind)).toEqual(["body", "collider"]);
  });

  test("rejects invalid shapes, missing bodies, and bad layer masks without candidate imports", () => {
    const normalized = normalizePhysicsSceneSpec({
      bodies: [
        {
          bodyId: "body:valid"
        }
      ],
      colliders: [
        {
          colliderId: "collider:missing-body",
          bodyId: "body:missing",
          shape: {
            type: "triangle"
          } as never,
          collision: {
            layer: "dynamic",
            mask: ["not-a-layer"]
          }
        }
      ]
    });

    expect(normalized.ok).toBe(false);
    expect(normalized.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["missing-body", "invalid-spec", "invalid-layer"]);
    expect(JSON.stringify(normalized.diagnostics)).not.toMatch(/RigidBody|ColliderDesc|Rapier|@dimforge|rawHandle|wasm/i);
  });

  test("validates individual body, collider, and layer policy helpers", () => {
    const fixedBody = normalizePhysicsBodySpec({
      bodyId: "body:floor",
      kind: "fixed"
    });
    const explicitMass = normalizePhysicsBodySpec({
      bodyId: "body:crate",
      massIntent: "explicit"
    });
    const layer = normalizePhysicsLayerMask(
      {
        layer: "character",
        mask: ["static", "dynamic"]
      },
      "dynamic"
    );
    const collider = normalizePhysicsColliderSpec(
      {
        colliderId: "collider:capsule",
        bodyId: "body:character",
        shape: {
          type: "capsule",
          halfHeight: 0.8,
          radius: 0.25
        },
        isTrigger: true
      },
      new Set(["body:character"])
    );

    expect(fixedBody.ok).toBe(true);
    expect(fixedBody.value).toMatchObject({
      kind: "fixed",
      massIntent: "immovable",
      gravityScale: 0
    });
    expect(explicitMass.ok).toBe(false);
    expect(explicitMass.diagnostics[0]?.code).toBe("invalid-spec");
    expect(layer.ok).toBe(true);
    expect(collider.ok).toBe(true);
    expect(collider.value).toMatchObject({
      isTrigger: true,
      collision: {
        layer: "trigger"
      },
      shape: {
        type: "capsule"
      }
    });
  });
});
