import {
  createPhysicsDiagnostic,
  createPhysicsResult,
  type PhysicsAdapter,
  type PhysicsBodySnapshot,
  type PhysicsBodySpec,
  type PhysicsColliderSnapshot,
  type PhysicsColliderSpec,
  type PhysicsDiagnostic,
  type PhysicsEventBatch,
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

export interface FakePhysicsAdapterOptions {
  config?: Partial<Omit<PhysicsWorldConfig, "fixedStep">> & {
    fixedStep?: Partial<PhysicsWorldConfig["fixedStep"]>;
  };
  fallbackReason?: string;
}

interface StoredBody {
  spec: PhysicsBodySpec;
  transform: PhysicsTransform;
  linearVelocity: PhysicsVector3;
  angularVelocity: PhysicsVector3;
  sleeping: boolean;
}

const zeroVector: PhysicsVector3 = {
  x: 0,
  y: 0,
  z: 0
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function addScaledVector(vector: PhysicsVector3, velocity: PhysicsVector3, seconds: number): PhysicsVector3 {
  return {
    x: vector.x + velocity.x * seconds,
    y: vector.y + velocity.y * seconds,
    z: vector.z + velocity.z * seconds
  };
}

function addVector(left: PhysicsVector3, right: PhysicsVector3): PhysicsVector3 {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z
  };
}

function multiplyVector(vector: PhysicsVector3, scalar: number): PhysicsVector3 {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
    z: vector.z * scalar
  };
}

export function createFakePhysicsAdapter(options: FakePhysicsAdapterOptions = {}): PhysicsAdapter {
  return new FakePhysicsAdapter(options);
}

export class FakePhysicsAdapter implements PhysicsAdapter {
  config: PhysicsWorldConfig;

  private readonly fallbackReason: string;
  private readonly diagnostics: PhysicsDiagnostic[];
  private readonly bodies = new Map<string, StoredBody>();
  private readonly colliders = new Map<string, PhysicsColliderSpec>();
  private state: PhysicsLifecycleState = "uninitialized";
  private stepIndex = 0;

  constructor(options: FakePhysicsAdapterOptions = {}) {
    this.config = normalizePhysicsWorldConfig({
      worldId: "fake-physics-world",
      sceneId: "fake-physics-scene",
      ...options.config
    });
    this.fallbackReason = options.fallbackReason ?? "Physics backend is unavailable; using deterministic fake PhysicsAdapter.";
    this.diagnostics = [this.fallbackDiagnostic()];
  }

  get lifecycle(): PhysicsLifecycleState {
    return this.state;
  }

  async boot(): Promise<PhysicsResult> {
    if (this.state === "disposed") {
      return this.disposedResult("Fake PhysicsAdapter has been disposed.");
    }

    this.state = "degraded";
    return this.fallbackResult({
      lifecycle: this.lifecycle,
      worldId: this.config.worldId
    });
  }

  async createWorld(config: PhysicsWorldConfig): Promise<PhysicsResult> {
    if (this.state === "disposed") {
      return this.disposedResult("Fake PhysicsAdapter has been disposed.");
    }

    this.config = cloneJson(config);
    this.config.fixedStep.accumulatorMs = Math.max(0, this.config.fixedStep.accumulatorMs);
    this.bodies.clear();
    this.colliders.clear();
    this.stepIndex = 0;
    this.state = "degraded";
    return this.fallbackResult({
      lifecycle: this.lifecycle,
      worldId: this.config.worldId
    });
  }

  async addBody(spec: PhysicsBodySpec): Promise<PhysicsResult<{ bodyId: string }>> {
    if (this.state === "disposed") {
      return this.disposedResult("Cannot add a body after physics world disposal.");
    }

    if (this.bodies.has(spec.bodyId)) {
      return createPhysicsResult("invalid-spec", {
        diagnostics: [createPhysicsDiagnostic("duplicate-id", `Physics body ${spec.bodyId} already exists.`, "error", false, { bodyId: spec.bodyId })]
      });
    }

    this.bodies.set(spec.bodyId, {
      spec: cloneJson(spec),
      transform: cloneJson(spec.initialTransform),
      linearVelocity: cloneJson(zeroVector),
      angularVelocity: cloneJson(zeroVector),
      sleeping: spec.sleep === "start-asleep"
    });

    return this.fallbackResult({ bodyId: spec.bodyId });
  }

  async addCollider(spec: PhysicsColliderSpec): Promise<PhysicsResult<{ colliderId: string; bodyId: string }>> {
    if (this.state === "disposed") {
      return this.disposedResult("Cannot add a collider after physics world disposal.");
    }

    if (!this.bodies.has(spec.bodyId)) {
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

    this.colliders.set(spec.colliderId, cloneJson(spec));
    return this.fallbackResult({
      colliderId: spec.colliderId,
      bodyId: spec.bodyId
    });
  }

  async removeBody(bodyId: string): Promise<PhysicsResult<{ bodyId: string }>> {
    if (this.state === "disposed") {
      return this.disposedResult("Cannot remove a body after physics world disposal.");
    }

    if (!this.bodies.delete(bodyId)) {
      return this.unknownBodyResult(bodyId);
    }

    for (const [colliderId, collider] of this.colliders) {
      if (collider.bodyId === bodyId) {
        this.colliders.delete(colliderId);
      }
    }

    return this.fallbackResult({ bodyId });
  }

  async removeCollider(colliderId: string): Promise<PhysicsResult<{ colliderId: string }>> {
    if (this.state === "disposed") {
      return this.disposedResult("Cannot remove a collider after physics world disposal.");
    }

    if (!this.colliders.delete(colliderId)) {
      return createPhysicsResult("invalid-spec", {
        diagnostics: [
          createPhysicsDiagnostic("unknown-collider", `Physics collider ${colliderId} is not registered.`, "error", false, { colliderId })
        ]
      });
    }

    return this.fallbackResult({ colliderId });
  }

  async setBodyTransform(bodyId: string, transform: PhysicsTransform): Promise<PhysicsResult<{ bodyId: string }>> {
    if (this.state === "disposed") {
      return this.disposedResult("Cannot set a body transform after physics world disposal.");
    }

    const body = this.bodies.get(bodyId);
    if (!body) {
      return this.unknownBodyResult(bodyId);
    }

    body.transform = cloneJson(transform);
    body.sleeping = false;
    return this.fallbackResult({ bodyId });
  }

  async setBodyVelocity(
    bodyId: string,
    linearVelocity: PhysicsVector3,
    angularVelocity: PhysicsVector3
  ): Promise<PhysicsResult<{ bodyId: string }>> {
    if (this.state === "disposed") {
      return this.disposedResult("Cannot set body velocity after physics world disposal.");
    }

    const body = this.bodies.get(bodyId);
    if (!body) {
      return this.unknownBodyResult(bodyId);
    }

    body.linearVelocity = cloneJson(linearVelocity);
    body.angularVelocity = cloneJson(angularVelocity);
    body.sleeping = false;
    return this.fallbackResult({ bodyId });
  }

  async applyBodyImpulse(bodyId: string, impulse: PhysicsVector3): Promise<PhysicsResult<{ bodyId: string }>> {
    if (this.state === "disposed") {
      return this.disposedResult("Cannot apply body impulse after physics world disposal.");
    }

    const body = this.bodies.get(bodyId);
    if (!body) {
      return this.unknownBodyResult(bodyId);
    }

    if (body.spec.kind === "fixed") {
      return createPhysicsResult("ignored", {
        value: { bodyId },
        diagnostics: [createPhysicsDiagnostic("fallback-used", "Impulse ignored for fixed fake physics body.", "info")]
      });
    }

    const mass = body.spec.massIntent === "explicit" && body.spec.mass ? body.spec.mass : 1;
    body.linearVelocity = addVector(body.linearVelocity, multiplyVector(impulse, 1 / mass));
    body.sleeping = false;
    return this.fallbackResult({ bodyId });
  }

  async step(request: PhysicsStepRequest): Promise<PhysicsStepResult> {
    if (this.state === "disposed") {
      return this.stepFailure(request.worldId, "disposed", [createPhysicsDiagnostic("disposed-world", "Physics world has been disposed.")]);
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
    const diagnostics = [this.fallbackDiagnostic()];

    if (possibleSteps > policy.maxCatchUpSteps) {
      diagnostics.push(
        createPhysicsDiagnostic("max-catch-up-clamped", "Physics fixed-step catch-up was clamped by adapter policy.", "warning", true, {
          possibleSteps,
          maxCatchUpSteps: policy.maxCatchUpSteps
        })
      );
    }

    for (let index = 0; index < simulatedSteps; index += 1) {
      this.integrateOneStep(policy.stepMs / 1000);
      this.stepIndex += 1;
      accumulator -= policy.stepMs;
    }

    this.config.fixedStep.accumulatorMs = Math.max(0, accumulator);

    return {
      status: "fallback",
      ok: true,
      worldId: this.config.worldId,
      stepIndex: this.stepIndex,
      simulatedSteps,
      remainingAccumulatorMs: this.config.fixedStep.accumulatorMs,
      transforms: this.bodySnapshots(),
      events: this.emptyEvents(diagnostics),
      diagnostics
    };
  }

  async raycast(query: PhysicsRaycastQuery): Promise<PhysicsQueryResult> {
    if (this.state === "disposed") {
      return this.queryFailure(query.queryId, "disposed", [createPhysicsDiagnostic("disposed-world", "Physics world has been disposed.")]);
    }

    return this.queryFailure(query.queryId, "query-miss", [
      createPhysicsDiagnostic("query-miss", "Fake PhysicsAdapter does not synthesize raycast hits.", "info", false, {
        worldId: query.worldId
      }),
      this.fallbackDiagnostic()
    ]);
  }

  async overlap(query: PhysicsOverlapQuery): Promise<PhysicsQueryResult> {
    if (this.state === "disposed") {
      return this.queryFailure(query.queryId, "disposed", [createPhysicsDiagnostic("disposed-world", "Physics world has been disposed.")]);
    }

    return {
      status: "fallback",
      ok: true,
      queryId: query.queryId,
      hits: [],
      diagnostics: [
        createPhysicsDiagnostic("query-miss", "Fake PhysicsAdapter overlap query returned no synthesized hits.", "info", false, {
          worldId: query.worldId
        }),
        this.fallbackDiagnostic()
      ]
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
    this.bodies.clear();
    this.colliders.clear();
    this.state = "disposed";
    return createPhysicsResult("success", {
      value: {
        lifecycle: this.lifecycle,
        worldId: this.config.worldId
      }
    });
  }

  private integrateOneStep(seconds: number): void {
    for (const body of this.bodies.values()) {
      if (body.spec.kind === "fixed" || body.sleeping) {
        continue;
      }

      body.transform = {
        position: addScaledVector(body.transform.position, body.linearVelocity, seconds),
        rotation: cloneJson(body.transform.rotation)
      };
    }
  }

  private bodySnapshots(): PhysicsBodySnapshot[] {
    return [...this.bodies.values()].map((body) => ({
      bodyId: body.spec.bodyId,
      sceneId: body.spec.sceneId,
      kind: body.spec.kind,
      transform: cloneJson(body.transform),
      linearVelocity: cloneJson(body.linearVelocity),
      angularVelocity: cloneJson(body.angularVelocity),
      sleeping: body.sleeping
    }));
  }

  private colliderSnapshots(): PhysicsColliderSnapshot[] {
    return [...this.colliders.values()].map((collider) => ({
      colliderId: collider.colliderId,
      bodyId: collider.bodyId,
      sceneId: collider.sceneId,
      isTrigger: collider.isTrigger,
      shape: cloneJson(collider.shape),
      collision: cloneJson(collider.collision),
      query: cloneJson(collider.query)
    }));
  }

  private fallbackResult<TValue extends PhysicsJsonObject>(value: TValue): PhysicsResult<TValue> {
    return createPhysicsResult("fallback", {
      value,
      diagnostics: [this.fallbackDiagnostic()]
    });
  }

  private disposedResult<TValue extends PhysicsJsonObject>(message: string): PhysicsResult<TValue> {
    return createPhysicsResult("disposed", {
      diagnostics: [createPhysicsDiagnostic("disposed-world", message)]
    });
  }

  private unknownBodyResult(bodyId: string): PhysicsResult<{ bodyId: string }> {
    return createPhysicsResult("invalid-spec", {
      diagnostics: [createPhysicsDiagnostic("unknown-body", `Physics body ${bodyId} is not registered.`, "error", false, { bodyId })]
    });
  }

  private fallbackDiagnostic(): PhysicsDiagnostic {
    return createPhysicsDiagnostic("fallback-used", this.fallbackReason, "info", false, {
      adapter: "fake-physics"
    });
  }

  private emptyEvents(diagnostics: PhysicsDiagnostic[]): PhysicsEventBatch {
    return {
      worldId: this.config.worldId,
      stepIndex: this.stepIndex,
      events: [],
      diagnostics: cloneJson(diagnostics)
    };
  }

  private stepFailure(worldId: string, status: "invalid-spec" | "disposed", diagnostics: PhysicsDiagnostic[]): PhysicsStepResult {
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

  private queryFailure(queryId: string, status: "query-miss" | "disposed", diagnostics: PhysicsDiagnostic[]): PhysicsQueryResult {
    return {
      status,
      ok: false,
      queryId,
      hits: [],
      diagnostics
    };
  }
}
