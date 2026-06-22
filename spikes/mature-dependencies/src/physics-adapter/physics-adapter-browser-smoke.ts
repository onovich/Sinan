import { createFakePhysicsAdapter } from "./fake-physics-adapter";
import { createRapierPhysicsAdapter } from "./rapier-physics-adapter";
import {
  normalizePhysicsBodySpec,
  normalizePhysicsColliderSpec,
  normalizePhysicsWorldConfig
} from "./physics-spec-normalizer";
import type { PhysicsBodySpec, PhysicsColliderSpec } from "./physics-adapter-types";

export interface PhysicsAdapterBrowserSmokeResult {
  adapter: "RapierPhysicsAdapter";
  supported: boolean;
  bootOk: boolean;
  worldOk: boolean;
  bodyColliderOk: boolean;
  stepOk: boolean;
  eventOk: boolean;
  queryOk: boolean;
  fallbackOk: boolean;
  disposeOk: boolean;
  contractClean: boolean;
  statuses: Record<string, string>;
  diagnostics: string[];
}

function bodySpec(bodyId: string, overrides: Partial<PhysicsBodySpec> = {}): PhysicsBodySpec {
  const result = normalizePhysicsBodySpec({
    bodyId,
    sceneId: "browser-physics-scene",
    initialTransform: {
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
    },
    ...overrides
  });

  if (!result.value) {
    throw new Error(`Invalid browser body spec: ${result.diagnostics.map((diagnostic) => diagnostic.message).join("; ")}`);
  }

  return result.value;
}

function colliderSpec(colliderId: string, bodyId: string, overrides: Partial<PhysicsColliderSpec> = {}): PhysicsColliderSpec {
  const result = normalizePhysicsColliderSpec(
    {
      colliderId,
      bodyId,
      sceneId: "browser-physics-scene",
      shape: {
        type: "ball",
        radius: 0.25
      },
      ...overrides
    },
    new Set([bodyId])
  );

  if (!result.value) {
    throw new Error(`Invalid browser collider spec: ${result.diagnostics.map((diagnostic) => diagnostic.message).join("; ")}`);
  }

  return result.value;
}

function createEmptyResult(): PhysicsAdapterBrowserSmokeResult {
  return {
    adapter: "RapierPhysicsAdapter",
    supported: typeof WebAssembly !== "undefined",
    bootOk: false,
    worldOk: false,
    bodyColliderOk: false,
    stepOk: false,
    eventOk: false,
    queryOk: false,
    fallbackOk: false,
    disposeOk: false,
    contractClean: false,
    statuses: {},
    diagnostics: []
  };
}

export async function runPhysicsAdapterBrowserSmoke(): Promise<PhysicsAdapterBrowserSmokeResult> {
  const result = createEmptyResult();
  if (!result.supported) {
    result.diagnostics.push("WebAssembly is not available in this browser runtime.");
    return result;
  }

  const adapter = createRapierPhysicsAdapter();
  const fallbackAdapter = createFakePhysicsAdapter();

  try {
    const boot = await adapter.boot();
    const world = await adapter.createWorld(
      normalizePhysicsWorldConfig({
        worldId: "browser-physics-world",
        sceneId: "browser-physics-scene",
        fixedStep: {
          stepMs: 16.6667,
          maxCatchUpSteps: 1,
          accumulatorMs: 0
        }
      })
    );

    const ground = await adapter.addBody(
      bodySpec("browser-ground", {
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
    const groundCollider = await adapter.addCollider(
      colliderSpec("browser-ground-collider", "browser-ground", {
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
    const triggerBody = await adapter.addBody(
      bodySpec("browser-trigger", {
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
    const triggerCollider = await adapter.addCollider(
      colliderSpec("browser-trigger-collider", "browser-trigger", {
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
    const ball = await adapter.addBody(
      bodySpec("browser-ball", {
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
    const ballCollider = await adapter.addCollider(colliderSpec("browser-ball-collider", "browser-ball"));

    const events = [];
    let latestY = 2.5;
    for (let index = 0; index < 180; index += 1) {
      const step = await adapter.step({
        worldId: "browser-physics-world",
        deltaMs: 16.6667,
        nowMs: index * 16.6667
      });
      events.push(...step.events.events);
      latestY = step.transforms.find((snapshot) => snapshot.bodyId === "browser-ball")?.transform.position.y ?? latestY;
    }

    const raycast = await adapter.raycast({
      queryId: "browser-raycast",
      worldId: "browser-physics-world",
      origin: {
        x: 0,
        y: 5,
        z: 0
      },
      direction: {
        x: 0,
        y: -1,
        z: 0
      },
      maxDistance: 10,
      query: {
        layer: "query",
        mask: ["query"]
      }
    });
    const overlap = await adapter.overlap({
      queryId: "browser-overlap",
      worldId: "browser-physics-world",
      shape: {
        type: "ball",
        radius: 0.5
      },
      transform: {
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
      },
      query: {
        layer: "query",
        mask: ["query"]
      }
    });
    const fallback = await fallbackAdapter.boot();
    const snapshot = await adapter.snapshot();
    const dispose = await adapter.dispose();

    result.statuses = {
      boot: boot.status,
      world: world.status,
      ground: ground.status,
      groundCollider: groundCollider.status,
      triggerBody: triggerBody.status,
      triggerCollider: triggerCollider.status,
      ball: ball.status,
      ballCollider: ballCollider.status,
      raycast: raycast.status,
      overlap: overlap.status,
      fallback: fallback.status,
      dispose: dispose.status
    };
    result.bootOk = boot.ok && boot.status === "success";
    result.worldOk = world.ok && snapshot.lifecycle === "ready";
    result.bodyColliderOk =
      ground.ok && groundCollider.ok && triggerBody.ok && triggerCollider.ok && ball.ok && ballCollider.ok && snapshot.colliders.length === 3;
    result.stepOk = latestY < 2.5 && snapshot.bodies.some((body) => body.bodyId === "browser-ball");
    result.eventOk = events.some((event) => event.type === "trigger-enter") && events.some((event) => event.type === "collision-start");
    result.queryOk = raycast.status === "success" && overlap.status === "success";
    result.fallbackOk = fallback.status === "fallback" && fallback.diagnostics.some((diagnostic) => diagnostic.code === "fallback-used");
    result.disposeOk = dispose.status === "success" && adapter.lifecycle === "disposed";
    result.contractClean = !/rawHandle|RigidBody|ColliderDesc|@dimforge|wasm/i.test(
      JSON.stringify({
        raycast,
        overlap,
        snapshot,
        events
      })
    );
    result.diagnostics.push(
      ...Object.entries(result.statuses).map(([key, value]) => `${key}: ${value}`),
      `event types: ${[...new Set(events.map((event) => event.type))].join(",")}`,
      `latest browser-ball y: ${latestY}`,
      `raycast hit: ${raycast.hit?.colliderId ?? "none"}`,
      `overlap hits: ${overlap.hits.map((hit) => hit.colliderId).join(",")}`,
      "PhysicsAdapter contract -> RapierPhysicsAdapter -> mature physics backend"
    );
  } catch (error) {
    result.diagnostics.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  } finally {
    try {
      await adapter.dispose();
    } catch (error) {
      result.diagnostics.push(error instanceof Error ? error.message : String(error));
    }
    try {
      await fallbackAdapter.dispose();
    } catch (error) {
      result.diagnostics.push(error instanceof Error ? error.message : String(error));
    }
  }

  return result;
}
