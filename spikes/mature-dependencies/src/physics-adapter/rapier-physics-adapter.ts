import * as RAPIER from "@dimforge/rapier3d-compat";
import {
  createPhysicsDiagnostic,
  createPhysicsResult,
  type PhysicsAdapter,
  type PhysicsBodySnapshot,
  type PhysicsBodySpec,
  type PhysicsColliderSnapshot,
  type PhysicsColliderShape,
  type PhysicsColliderSpec,
  type PhysicsDiagnostic,
  type PhysicsJsonObject,
  type PhysicsLifecycleState,
  type PhysicsOverlapQuery,
  type PhysicsQueryResult,
  type PhysicsRaycastQuery,
  type PhysicsResult,
  type PhysicsStepRequest,
  type PhysicsStepResult,
  type PhysicsTransform,
  type PhysicsVector3,
  type PhysicsWorldConfig
} from "./physics-adapter-types";
import { normalizePhysicsWorldConfig } from "./physics-spec-normalizer";

export interface RapierPhysicsAdapterOptions {
  config?: Partial<Omit<PhysicsWorldConfig, "fixedStep">> & {
    fixedStep?: Partial<PhysicsWorldConfig["fixedStep"]>;
  };
}

interface RapierBodyRecord {
  spec: PhysicsBodySpec;
  handle: number;
}

interface RapierColliderRecord {
  spec: PhysicsColliderSpec;
  handle: number;
}

const zeroVector: PhysicsVector3 = {
  x: 0,
  y: 0,
  z: 0
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toVector3(value: { x: number; y: number; z: number }): PhysicsVector3 {
  return {
    x: value.x,
    y: value.y,
    z: value.z
  };
}

function toTransform(body: RAPIER.RigidBody): PhysicsTransform {
  const translation = body.translation();
  const rotation = body.rotation();
  return {
    position: {
      x: translation.x,
      y: translation.y,
      z: translation.z
    },
    rotation: {
      x: rotation.x,
      y: rotation.y,
      z: rotation.z,
      w: rotation.w
    }
  };
}

export function createRapierPhysicsAdapter(options: RapierPhysicsAdapterOptions = {}): PhysicsAdapter {
  return new RapierPhysicsAdapter(options);
}

export class RapierPhysicsAdapter implements PhysicsAdapter {
  config: PhysicsWorldConfig;

  private state: PhysicsLifecycleState = "uninitialized";
  private world?: RAPIER.World;
  private events?: RAPIER.EventQueue;
  private stepIndex = 0;
  private readonly diagnostics: PhysicsDiagnostic[] = [];
  private readonly bodies = new Map<string, RapierBodyRecord>();
  private readonly colliders = new Map<string, RapierColliderRecord>();

  constructor(options: RapierPhysicsAdapterOptions = {}) {
    this.config = normalizePhysicsWorldConfig({
      worldId: "rapier-physics-world",
      sceneId: "rapier-physics-scene",
      ...options.config
    });
  }

  get lifecycle(): PhysicsLifecycleState {
    return this.state;
  }

  async boot(): Promise<PhysicsResult> {
    if (this.state === "disposed") {
      return this.disposedResult("Rapier PhysicsAdapter has been disposed.");
    }

    try {
      await RAPIER.init();
      this.state = this.world ? "ready" : "uninitialized";
      return createPhysicsResult("success", {
        value: {
          packageName: "@dimforge/rapier3d-compat",
          packageVersion: RAPIER.version()
        }
      });
    } catch (error) {
      this.state = "unsupported";
      const diagnostic = createPhysicsDiagnostic("wasm-init-failed", "Rapier WASM initialization failed.", "error", true, {
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      });
      this.diagnostics.push(diagnostic);
      return createPhysicsResult("wasm-failed", {
        diagnostics: [diagnostic]
      });
    }
  }

  async createWorld(config: PhysicsWorldConfig): Promise<PhysicsResult> {
    if (this.state === "disposed") {
      return this.disposedResult("Cannot create Rapier world after disposal.");
    }

    const boot = await this.boot();
    if (!boot.ok) {
      return boot;
    }

    this.freeWorld();
    this.config = cloneJson(config);
    this.world = new RAPIER.World(cloneJson(this.config.gravity));
    this.events = new RAPIER.EventQueue(true);
    this.stepIndex = 0;
    this.bodies.clear();
    this.colliders.clear();
    this.state = "ready";
    return createPhysicsResult("success", {
      value: {
        worldId: this.config.worldId,
        sceneId: this.config.sceneId
      }
    });
  }

  async addBody(spec: PhysicsBodySpec): Promise<PhysicsResult<{ bodyId: string }>> {
    const ready = this.requireWorld<{ bodyId: string }>();
    if (!ready.ok) {
      return ready.result;
    }

    if (this.bodies.has(spec.bodyId)) {
      return createPhysicsResult("invalid-spec", {
        diagnostics: [createPhysicsDiagnostic("duplicate-id", `Physics body ${spec.bodyId} already exists.`, "error", false, { bodyId: spec.bodyId })]
      });
    }

    const body = ready.world.createRigidBody(this.createRigidBodyDesc(spec));
    this.bodies.set(spec.bodyId, {
      spec: cloneJson(spec),
      handle: body.handle
    });

    return createPhysicsResult("success", {
      value: {
        bodyId: spec.bodyId
      }
    });
  }

  async addCollider(spec: PhysicsColliderSpec): Promise<PhysicsResult<{ colliderId: string; bodyId: string }>> {
    const ready = this.requireWorld<{ colliderId: string; bodyId: string }>();
    if (!ready.ok) {
      return ready.result;
    }

    const body = this.bodyById(spec.bodyId);
    if (!body) {
      return createPhysicsResult("invalid-spec", {
        diagnostics: [
          createPhysicsDiagnostic("missing-body", `Physics collider ${spec.colliderId} references missing body ${spec.bodyId}.`, "error", false, {
            colliderId: spec.colliderId,
            bodyId: spec.bodyId
          })
        ]
      });
    }

    if (this.colliders.has(spec.colliderId)) {
      return createPhysicsResult("invalid-spec", {
        diagnostics: [
          createPhysicsDiagnostic("duplicate-id", `Physics collider ${spec.colliderId} already exists.`, "error", false, {
            colliderId: spec.colliderId
          })
        ]
      });
    }

    const collider = ready.world.createCollider(this.createColliderDesc(spec), body);
    this.colliders.set(spec.colliderId, {
      spec: cloneJson(spec),
      handle: collider.handle
    });

    return createPhysicsResult("success", {
      value: {
        colliderId: spec.colliderId,
        bodyId: spec.bodyId
      }
    });
  }

  async removeBody(bodyId: string): Promise<PhysicsResult<{ bodyId: string }>> {
    const ready = this.requireWorld<{ bodyId: string }>();
    if (!ready.ok) {
      return ready.result;
    }

    const body = this.bodyById(bodyId);
    if (!body) {
      return this.unknownBodyResult(bodyId);
    }

    ready.world.removeRigidBody(body);
    this.bodies.delete(bodyId);
    for (const [colliderId, collider] of this.colliders) {
      if (collider.spec.bodyId === bodyId) {
        this.colliders.delete(colliderId);
      }
    }

    return createPhysicsResult("success", {
      value: {
        bodyId
      }
    });
  }

  async removeCollider(colliderId: string): Promise<PhysicsResult<{ colliderId: string }>> {
    const ready = this.requireWorld<{ colliderId: string }>();
    if (!ready.ok) {
      return ready.result;
    }

    const collider = this.colliderById(colliderId);
    if (!collider) {
      return createPhysicsResult("invalid-spec", {
        diagnostics: [
          createPhysicsDiagnostic("unknown-collider", `Physics collider ${colliderId} is not registered.`, "error", false, { colliderId })
        ]
      });
    }

    ready.world.removeCollider(collider, true);
    this.colliders.delete(colliderId);
    return createPhysicsResult("success", {
      value: {
        colliderId
      }
    });
  }

  async setBodyTransform(bodyId: string, transform: PhysicsTransform): Promise<PhysicsResult<{ bodyId: string }>> {
    const body = this.bodyById(bodyId);
    if (!body) {
      return this.unknownBodyResult(bodyId);
    }

    body.setTranslation(transform.position, true);
    body.setRotation(transform.rotation, true);
    return createPhysicsResult("success", {
      value: {
        bodyId
      }
    });
  }

  async setBodyVelocity(
    bodyId: string,
    linearVelocity: PhysicsVector3,
    angularVelocity: PhysicsVector3
  ): Promise<PhysicsResult<{ bodyId: string }>> {
    const body = this.bodyById(bodyId);
    if (!body) {
      return this.unknownBodyResult(bodyId);
    }

    body.setLinvel(linearVelocity, true);
    body.setAngvel(angularVelocity, true);
    return createPhysicsResult("success", {
      value: {
        bodyId
      }
    });
  }

  async applyBodyImpulse(bodyId: string, impulse: PhysicsVector3): Promise<PhysicsResult<{ bodyId: string }>> {
    const body = this.bodyById(bodyId);
    if (!body) {
      return this.unknownBodyResult(bodyId);
    }

    body.applyImpulse(impulse, true);
    return createPhysicsResult("success", {
      value: {
        bodyId
      }
    });
  }

  async step(request: PhysicsStepRequest): Promise<PhysicsStepResult> {
    const ready = this.requireWorld();
    if (!ready.ok) {
      return this.stepFailure(request.worldId, ready.result.status, ready.result.diagnostics);
    }

    if (request.worldId !== this.config.worldId) {
      return this.stepFailure(request.worldId, "invalid-spec", [
        createPhysicsDiagnostic("invalid-spec", `Step request worldId ${request.worldId} does not match ${this.config.worldId}.`, "error", false, {
          requestedWorldId: request.worldId,
          worldId: this.config.worldId
        })
      ]);
    }

    const policy = this.config.fixedStep;
    let accumulator = policy.accumulatorMs + Math.max(0, request.deltaMs);
    const possibleSteps = Math.floor(accumulator / policy.stepMs);
    const simulatedSteps = Math.min(possibleSteps, policy.maxCatchUpSteps);
    const diagnostics: PhysicsDiagnostic[] = [];

    if (possibleSteps > policy.maxCatchUpSteps) {
      diagnostics.push(
        createPhysicsDiagnostic("max-catch-up-clamped", "Physics fixed-step catch-up was clamped by adapter policy.", "warning", true, {
          possibleSteps,
          maxCatchUpSteps: policy.maxCatchUpSteps
        })
      );
    }

    for (let index = 0; index < simulatedSteps; index += 1) {
      try {
        ready.world.timestep = policy.stepMs / 1000;
        ready.world.step(ready.events);
        ready.events.drainCollisionEvents(() => undefined);
        this.stepIndex += 1;
        accumulator -= policy.stepMs;
      } catch (error) {
        const diagnostic = createPhysicsDiagnostic("step-failed", "Rapier world step failed.", "error", true, {
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        });
        this.diagnostics.push(diagnostic);
        return this.stepFailure(this.config.worldId, "unsupported", [diagnostic]);
      }
    }

    this.config.fixedStep.accumulatorMs = Math.max(0, accumulator);

    return {
      status: "success",
      ok: true,
      worldId: this.config.worldId,
      stepIndex: this.stepIndex,
      simulatedSteps,
      remainingAccumulatorMs: this.config.fixedStep.accumulatorMs,
      transforms: this.bodySnapshots(),
      events: {
        worldId: this.config.worldId,
        stepIndex: this.stepIndex,
        events: [],
        diagnostics: cloneJson(diagnostics)
      },
      diagnostics
    };
  }

  async raycast(query: PhysicsRaycastQuery): Promise<PhysicsQueryResult> {
    return {
      status: "query-miss",
      ok: false,
      queryId: query.queryId,
      hits: [],
      diagnostics: [createPhysicsDiagnostic("query-miss", "Rapier query implementation is staged for a later implementation round.", "info")]
    };
  }

  async overlap(query: PhysicsOverlapQuery): Promise<PhysicsQueryResult> {
    return {
      status: "query-miss",
      ok: false,
      queryId: query.queryId,
      hits: [],
      diagnostics: [createPhysicsDiagnostic("query-miss", "Rapier overlap implementation is staged for a later implementation round.", "info")]
    };
  }

  async snapshot() {
    return {
      lifecycle: this.lifecycle,
      world: cloneJson(this.config),
      bodies: this.bodySnapshots(),
      colliders: this.colliderSnapshots(),
      diagnostics: cloneJson(this.diagnostics)
    };
  }

  async dispose(): Promise<PhysicsResult> {
    this.freeWorld();
    this.state = "disposed";
    return createPhysicsResult("success", {
      value: {
        lifecycle: this.lifecycle,
        worldId: this.config.worldId
      }
    });
  }

  protected bodyById(bodyId: string): RAPIER.RigidBody | undefined {
    if (!this.world) {
      return undefined;
    }

    const record = this.bodies.get(bodyId);
    return record ? this.world.getRigidBody(record.handle) : undefined;
  }

  protected colliderById(colliderId: string): RAPIER.Collider | undefined {
    if (!this.world) {
      return undefined;
    }

    const record = this.colliders.get(colliderId);
    return record ? this.world.getCollider(record.handle) : undefined;
  }

  protected requireWorld<TValue extends PhysicsJsonObject = PhysicsJsonObject>():
    | {
        ok: true;
        world: RAPIER.World;
        events: RAPIER.EventQueue;
      }
    | {
        ok: false;
        result: PhysicsResult<TValue>;
      } {
    if (this.state === "disposed") {
      return {
        ok: false,
        result: this.disposedResult("Rapier PhysicsAdapter has been disposed.")
      };
    }

    if (!this.world || !this.events) {
      return {
        ok: false,
        result: createPhysicsResult("invalid-spec", {
          diagnostics: [createPhysicsDiagnostic("invalid-spec", "Rapier physics world has not been created.")]
        })
      };
    }

    return {
      ok: true,
      world: this.world,
      events: this.events
    };
  }

  private createRigidBodyDesc(spec: PhysicsBodySpec): RAPIER.RigidBodyDesc {
    const desc =
      spec.kind === "fixed"
        ? RAPIER.RigidBodyDesc.fixed()
        : spec.kind === "kinematic"
          ? RAPIER.RigidBodyDesc.kinematicPositionBased()
          : RAPIER.RigidBodyDesc.dynamic();

    desc
      .setTranslation(spec.initialTransform.position.x, spec.initialTransform.position.y, spec.initialTransform.position.z)
      .setRotation(spec.initialTransform.rotation)
      .setLinearDamping(spec.linearDamping)
      .setAngularDamping(spec.angularDamping)
      .setGravityScale(spec.gravityScale)
      .setCanSleep(spec.sleep !== "prevent")
      .setSleeping(spec.sleep === "start-asleep");

    if (spec.massIntent === "explicit" && spec.mass !== undefined) {
      desc.setAdditionalMass(spec.mass);
    }

    return desc;
  }

  private createColliderDesc(spec: PhysicsColliderSpec): RAPIER.ColliderDesc {
    const desc = this.createShapeDesc(spec.shape)
      .setTranslation(spec.localTransform.position.x, spec.localTransform.position.y, spec.localTransform.position.z)
      .setRotation(spec.localTransform.rotation)
      .setSensor(spec.isTrigger)
      .setFriction(spec.material.friction)
      .setRestitution(spec.material.restitution)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    if (spec.material.density !== undefined) {
      desc.setDensity(spec.material.density);
    }

    return desc;
  }

  private createShapeDesc(shape: PhysicsColliderShape): RAPIER.ColliderDesc {
    if (shape.type === "cuboid") {
      return RAPIER.ColliderDesc.cuboid(shape.halfExtents.x, shape.halfExtents.y, shape.halfExtents.z);
    }

    if (shape.type === "ball") {
      return RAPIER.ColliderDesc.ball(shape.radius);
    }

    return RAPIER.ColliderDesc.capsule(shape.halfHeight, shape.radius);
  }

  private bodySnapshots(): PhysicsBodySnapshot[] {
    return [...this.bodies.entries()].map(([bodyId, record]) => {
      const body = this.bodyById(bodyId);
      return {
        bodyId,
        sceneId: record.spec.sceneId,
        kind: record.spec.kind,
        transform: body ? toTransform(body) : cloneJson(record.spec.initialTransform),
        linearVelocity: body ? toVector3(body.linvel()) : cloneJson(zeroVector),
        angularVelocity: body ? toVector3(body.angvel()) : cloneJson(zeroVector),
        sleeping: body ? body.isSleeping() : false
      };
    });
  }

  private colliderSnapshots(): PhysicsColliderSnapshot[] {
    return [...this.colliders.values()].map((record) => ({
      colliderId: record.spec.colliderId,
      bodyId: record.spec.bodyId,
      sceneId: record.spec.sceneId,
      isTrigger: record.spec.isTrigger,
      shape: cloneJson(record.spec.shape),
      collision: cloneJson(record.spec.collision),
      query: cloneJson(record.spec.query)
    }));
  }

  private disposedResult<TValue extends PhysicsJsonObject = PhysicsJsonObject>(message: string): PhysicsResult<TValue> {
    return createPhysicsResult("disposed", {
      diagnostics: [createPhysicsDiagnostic("disposed-world", message)]
    });
  }

  private unknownBodyResult(bodyId: string): PhysicsResult<{ bodyId: string }> {
    return createPhysicsResult("invalid-spec", {
      diagnostics: [createPhysicsDiagnostic("unknown-body", `Physics body ${bodyId} is not registered.`, "error", false, { bodyId })]
    });
  }

  private stepFailure(worldId: string, status: PhysicsResult["status"], diagnostics: PhysicsDiagnostic[]): PhysicsStepResult {
    return {
      status,
      ok: false,
      worldId,
      stepIndex: this.stepIndex,
      simulatedSteps: 0,
      remainingAccumulatorMs: this.config.fixedStep.accumulatorMs,
      transforms: [],
      events: {
        worldId,
        stepIndex: this.stepIndex,
        events: [],
        diagnostics: cloneJson(diagnostics)
      },
      diagnostics
    };
  }

  private freeWorld(): void {
    this.bodies.clear();
    this.colliders.clear();
    this.events = undefined;
    this.world?.free();
    this.world = undefined;
  }
}
