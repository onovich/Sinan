import { describe, expect, test } from "vitest";
import { createAudioCueRegistry } from "./audio-cue-registry";
import { createWebAudioSystemAdapter, type WebAudioContextLike } from "./web-audio-system-adapter";
import type { AudioCommand } from "./audio-system-types";

class FakeAudioParam {
  value: number;

  constructor(value = 0) {
    this.value = value;
  }

  setValueAtTime(value: number): void {
    this.value = value;
  }
}

class FakeAudioNode {
  readonly connections: FakeAudioNode[] = [];
  disconnected = false;

  connect(destination: FakeAudioNode): FakeAudioNode {
    this.connections.push(destination);
    return destination;
  }

  disconnect(): void {
    this.disconnected = true;
  }
}

class FakeGainNode extends FakeAudioNode {
  readonly gain = new FakeAudioParam(1);
}

class FakePannerNode extends FakeAudioNode {
  panningModel?: PanningModelType;
  distanceModel?: DistanceModelType;
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
  readonly positionX = new FakeAudioParam(0);
  readonly positionY = new FakeAudioParam(0);
  readonly positionZ = new FakeAudioParam(0);
}

class FakeBufferSourceNode extends FakeAudioNode {
  buffer: unknown;
  loop = false;
  onended: (() => void) | null = null;
  startedAt?: number;
  stoppedAt?: number;

  start(when = 0): void {
    this.startedAt = when;
  }

  stop(when = 0): void {
    this.stoppedAt = when;
    this.onended?.();
  }
}

class FakeAudioContext implements WebAudioContextLike {
  readonly sampleRate = 48_000;
  readonly destination = new FakeAudioNode();
  readonly gains: FakeGainNode[] = [];
  readonly panners: FakePannerNode[] = [];
  readonly sources: FakeBufferSourceNode[] = [];
  readonly listener = {
    positionX: new FakeAudioParam(0),
    positionY: new FakeAudioParam(0),
    positionZ: new FakeAudioParam(0),
    forwardX: new FakeAudioParam(0),
    forwardY: new FakeAudioParam(0),
    forwardZ: new FakeAudioParam(-1),
    upX: new FakeAudioParam(0),
    upY: new FakeAudioParam(1),
    upZ: new FakeAudioParam(0)
  };
  currentTime = 3;
  state: AudioContextState = "suspended";
  resumeError?: Error;
  decodeError?: Error;
  decodedBuffers: unknown[] = [];

  async resume(): Promise<void> {
    if (this.resumeError) {
      throw this.resumeError;
    }
    this.state = "running";
  }

  async suspend(): Promise<void> {
    this.state = "suspended";
  }

  async close(): Promise<void> {
    this.state = "closed";
  }

  createGain(): FakeGainNode {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain;
  }

  createPanner(): FakePannerNode {
    const panner = new FakePannerNode();
    this.panners.push(panner);
    return panner;
  }

  createBufferSource(): FakeBufferSourceNode {
    const source = new FakeBufferSourceNode();
    this.sources.push(source);
    return source;
  }

  createBuffer(channels: number, frameCount: number, sampleRate: number): unknown {
    return {
      channels,
      frameCount,
      sampleRate
    };
  }

  async decodeAudioData(data: ArrayBuffer): Promise<unknown> {
    if (this.decodeError) {
      throw this.decodeError;
    }
    const buffer = {
      decodedBytes: data.byteLength
    };
    this.decodedBuffers.push(buffer);
    return buffer;
  }
}

function command(
  type: AudioCommand["type"],
  overrides: Partial<Omit<AudioCommand, "commandId" | "type" | "submittedAt" | "payload">> & {
    payload?: AudioCommand["payload"];
  } = {}
): AudioCommand {
  return {
    commandId: `${type}-command`,
    type,
    submittedAt: 10,
    payload: overrides.payload ?? {},
    ...overrides
  };
}

function fixtureRegistry() {
  return createAudioCueRegistry([
    {
      cueId: "door-open",
      assetId: "asset:sfx/door-open.wav",
      busId: "effects",
      declaredDurationMs: 320,
      gain: 0.5,
      timeline: {
        timelineId: "intro",
        blocking: "until-complete",
        completionPolicy: "declared-duration"
      },
      spatial: {
        mode: "position",
        position: {
          x: 2,
          y: 3,
          z: 4
        }
      }
    },
    {
      cueId: "entity-hum",
      assetId: "asset:ambience/entity-hum.ogg",
      busId: "ambience",
      declaredDurationMs: 640,
      spatial: {
        mode: "entity",
        entityId: "npc:missing"
      }
    }
  ]);
}

function ctorFor(context: FakeAudioContext): new () => WebAudioContextLike {
  return class {
    constructor() {
      return context;
    }
  } as unknown as new () => WebAudioContextLike;
}

function bytes(length: number): ArrayBuffer {
  return new Uint8Array(length).buffer;
}

describe("WebAudioSystemAdapter", () => {
  test("falls back silently when AudioContext is unavailable without leaking browser objects", async () => {
    const adapter = createWebAudioSystemAdapter({
      registry: fixtureRegistry(),
      AudioContextCtor: undefined,
      now: () => 1_000
    });

    const boot = await adapter.boot();
    const play = await adapter.play(command("play", { cueId: "door-open" }));
    const snapshot = await adapter.snapshot();

    expect(adapter.lifecycle).toBe("unsupported");
    expect(boot.status).toBe("fallback");
    expect(play.status).toBe("fallback");
    expect(play.diagnostics.map((diagnostic) => diagnostic.code)).toContain("unsupported-browser");
    expect(JSON.stringify({ boot, play, snapshot })).not.toMatch(
      /AudioContext|GainNode|PannerNode|AudioBufferSourceNode|HTMLAudio|decodeAudioData/i
    );
  });

  test("creates the Web Audio context and unlocks it through the adapter lifecycle", async () => {
    const context = new FakeAudioContext();
    const adapter = createWebAudioSystemAdapter({
      registry: fixtureRegistry(),
      AudioContextCtor: ctorFor(context)
    });

    const boot = await adapter.boot();
    const unlock = await adapter.unlock(command("unlock"));

    expect(boot.status).toBe("accepted");
    expect(boot.value).toMatchObject({
      lifecycle: "locked",
      contextState: "suspended",
      sampleRate: 48_000
    });
    expect(unlock.status).toBe("accepted");
    expect(unlock.value).toMatchObject({
      lifecycle: "running",
      contextState: "running"
    });
    expect(context.gains.length).toBeGreaterThanOrEqual(5);
    expect(adapter.lifecycle).toBe("running");
  });

  test("decodes assets, wires source through spatial panner and bus gain, and records completion evidence", async () => {
    const context = new FakeAudioContext();
    const adapter = createWebAudioSystemAdapter({
      registry: fixtureRegistry(),
      AudioContextCtor: ctorFor(context),
      assetData: {
        "asset:sfx/door-open.wav": bytes(12)
      },
      now: () => 5_000
    });

    const result = await adapter.play(command("play", { cueId: "door-open" }));
    context.sources[0]?.onended?.();
    const snapshot = await adapter.snapshot();

    expect(result.status).toBe("accepted");
    expect(result.durationMs).toBe(320);
    expect(result.events.map((event) => event.type)).toEqual(["started", "completed"]);
    expect(context.decodedBuffers).toHaveLength(1);
    expect(context.sources[0]).toMatchObject({
      loop: false,
      startedAt: 3
    });
    expect(context.panners[0]).toMatchObject({
      distanceModel: "inverse"
    });
    expect(context.panners[0]?.positionX.value).toBe(2);
    expect(snapshot.cues[0]).toMatchObject({
      cueId: "door-open",
      state: "ended",
      busId: "effects",
      spatial: {
        mode: "position"
      }
    });
  });

  test("reports missing asset and decode failure as fallback diagnostics", async () => {
    const missingContext = new FakeAudioContext();
    const missing = createWebAudioSystemAdapter({
      registry: fixtureRegistry(),
      AudioContextCtor: ctorFor(missingContext)
    });

    const decodeContext = new FakeAudioContext();
    decodeContext.decodeError = new Error("decode failed");
    const decodeFailed = createWebAudioSystemAdapter({
      registry: fixtureRegistry(),
      AudioContextCtor: ctorFor(decodeContext),
      assetData: {
        "asset:sfx/door-open.wav": bytes(8)
      }
    });

    const missingResult = await missing.play(command("play", { cueId: "door-open" }));
    const decodeResult = await decodeFailed.play(command("play", { cueId: "door-open" }));

    expect(missingResult.status).toBe("fallback");
    expect(missingResult.diagnostics.map((diagnostic) => diagnostic.code)).toContain("missing-asset");
    expect(decodeResult.status).toBe("fallback");
    expect(decodeResult.diagnostics.map((diagnostic) => diagnostic.code)).toContain("decode-failure");
  });

  test("updates bus gain, mute, pause/resume state, listener transform, and scene disposal", async () => {
    const context = new FakeAudioContext();
    const adapter = createWebAudioSystemAdapter({
      registry: fixtureRegistry(),
      AudioContextCtor: ctorFor(context),
      assetData: {
        "asset:sfx/door-open.wav": bytes(12),
        "asset:ambience/entity-hum.ogg": bytes(16)
      }
    });

    await adapter.play(command("play", { cueId: "door-open" }));
    const gain = await adapter.setBusGain(
      command("set-bus-gain", {
        busId: "effects",
        payload: {
          gain: 0.25
        }
      })
    );
    const muted = await adapter.setBusMuted(
      command("set-bus-muted", {
        busId: "effects",
        payload: {
          muted: true
        }
      })
    );
    const paused = await adapter.pauseBus(command("pause-bus", { busId: "effects" }));
    const resumed = await adapter.resumeBus(command("resume-bus", { busId: "effects" }));
    const listener = await adapter.setListenerTransform(
      command("set-listener-transform", {
        payload: {
          listener: {
            position: {
              x: 9,
              y: 8,
              z: 7
            }
          }
        }
      })
    );
    const entityCue = await adapter.play(command("play", { cueId: "entity-hum" }));
    const disposed = await adapter.disposeSceneAudio(command("dispose-scene", { sceneId: "scene:one" }));

    expect(gain.value).toMatchObject({ gain: 0.25 });
    expect(muted.value).toMatchObject({ muted: true });
    expect(paused.value).toMatchObject({ state: "paused", affected: 1 });
    expect(resumed.value).toMatchObject({ state: "playing", affected: 1 });
    expect(listener.value?.listener).toMatchObject({
      position: {
        x: 9,
        y: 8,
        z: 7
      }
    });
    expect(context.listener.positionX.value).toBe(9);
    expect(entityCue.events.map((event) => event.type)).toContain("failed");
    expect(entityCue.events[0]?.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain("spatial-target-missing");
    expect(entityCue.events.some((event) => event.diagnostics.some((diagnostic) => diagnostic.code === "spatial-target-missing"))).toBe(
      true
    );
    expect(disposed.status).toBe("completed");
    expect(context.state).toBe("closed");
    expect(adapter.lifecycle).toBe("disposed");
  });
});
