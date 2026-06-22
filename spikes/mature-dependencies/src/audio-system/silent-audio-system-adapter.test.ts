import { describe, expect, test } from "vitest";
import { createAudioCueRegistry } from "./audio-cue-registry";
import { createSilentAudioSystemAdapter } from "./silent-audio-system-adapter";
import type { AudioCommand } from "./audio-system-types";

function command(
  type: AudioCommand["type"],
  overrides: Partial<Omit<AudioCommand, "commandId" | "type" | "submittedAt" | "payload">> & {
    payload?: AudioCommand["payload"];
  } = {}
): AudioCommand {
  return {
    commandId: `${type}-command`,
    type,
    submittedAt: 100,
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
      declaredDurationMs: 240,
      gain: 0.75,
      timeline: {
        timelineId: "intro",
        blocking: "until-complete",
        completionPolicy: "declared-duration"
      },
      spatial: {
        mode: "position",
        position: {
          x: 1,
          y: 2,
          z: 3
        }
      }
    },
    {
      cueId: "looping-wind",
      assetId: "asset:ambience/wind.ogg",
      busId: "ambience",
      declaredDurationMs: 1_000,
      loop: true,
      timeline: {
        timelineId: "intro",
        blocking: "none",
        completionPolicy: "manual"
      }
    }
  ]);
}

describe("SilentAudioSystemAdapter", () => {
  test("boots as a silent fallback without leaking browser audio objects", async () => {
    const adapter = createSilentAudioSystemAdapter({ registry: fixtureRegistry() });

    const boot = await adapter.boot();
    const snapshot = await adapter.snapshot();

    expect(adapter.lifecycle).toBe("silent");
    expect(boot.status).toBe("fallback");
    expect(boot.diagnostics[0]?.code).toBe("silent-fallback");
    expect(snapshot.buses.map((bus) => bus.busId)).toContain("master");
    expect(JSON.stringify({ boot, snapshot })).not.toMatch(
      /AudioContext|GainNode|PannerNode|AudioBuffer|AudioBufferSourceNode|HTMLAudio/i
    );
  });

  test("accepts registered cues and completes non-looping timeline bindings by declared duration", async () => {
    const adapter = createSilentAudioSystemAdapter({
      registry: fixtureRegistry(),
      now: () => 1_000
    });

    const result = await adapter.play(command("play", { cueId: "door-open" }));
    const snapshot = await adapter.snapshot();

    expect(result).toMatchObject({
      status: "fallback",
      ok: true,
      cueId: "door-open",
      durationMs: 240
    });
    expect(result.events.map((event) => event.type)).toEqual(["started", "ended", "completed"]);
    expect(result.events.map((event) => event.occurredAt)).toEqual([1_000, 1_240, 1_240]);
    expect(snapshot.cues[0]).toMatchObject({
      cueId: "door-open",
      busId: "effects",
      state: "ended",
      timeline: {
        timelineId: "intro",
        blocking: "until-complete"
      },
      spatial: {
        mode: "position"
      }
    });
  });

  test("keeps manual looping cues active until an explicit stop command interrupts them", async () => {
    const adapter = createSilentAudioSystemAdapter({
      registry: fixtureRegistry(),
      now: () => 2_000
    });

    const play = await adapter.play(command("play", { cueId: "looping-wind" }));
    const stop = await adapter.stop(command("stop", { cueId: "looping-wind" }));
    const snapshot = await adapter.snapshot();

    expect(play.events.map((event) => event.type)).toEqual(["started"]);
    expect(stop.status).toBe("completed");
    expect(stop.events[0]).toMatchObject({
      type: "interrupted",
      cueId: "looping-wind",
      busId: "ambience"
    });
    expect(snapshot.cues[0]?.state).toBe("interrupted");
  });

  test("returns adapter-owned diagnostics for missing cue assets and unknown buses", async () => {
    const adapter = createSilentAudioSystemAdapter({ registry: fixtureRegistry() });

    const missingAsset = await adapter.preload(command("preload", { cueId: "bad-cue" }));
    const unknownBus = await adapter.setBusGain(
      command("set-bus-gain", {
        busId: "cinematic",
        payload: {
          gain: 0.5
        }
      })
    );

    expect(missingAsset.status).toBe("failed");
    expect(missingAsset.diagnostics[0]?.code).toBe("invalid-cue");
    expect(unknownBus.status).toBe("failed");
    expect(unknownBus.diagnostics[0]).toMatchObject({
      code: "unknown-bus",
      detail: {
        busId: "cinematic"
      }
    });
  });

  test("updates bus gain, mute state, listener transform, and scene disposal through JSON commands", async () => {
    const adapter = createSilentAudioSystemAdapter({ registry: fixtureRegistry() });

    await adapter.play(command("play", { cueId: "looping-wind" }));
    const gain = await adapter.setBusGain(
      command("set-bus-gain", {
        busId: "ambience",
        payload: {
          gain: 1.4
        }
      })
    );
    const muted = await adapter.setBusMuted(
      command("set-bus-muted", {
        busId: "ambience",
        payload: {
          muted: true
        }
      })
    );
    const listener = await adapter.setListenerTransform(
      command("set-listener-transform", {
        payload: {
          listener: {
            position: {
              x: 4,
              y: 5,
              z: 6
            }
          }
        }
      })
    );
    const disposed = await adapter.disposeSceneAudio(command("dispose-scene", { sceneId: "scene:one" }));
    const snapshot = await adapter.snapshot();

    expect(gain.value).toMatchObject({ gain: 1 });
    expect(muted.value).toMatchObject({ muted: true });
    expect(listener.value?.listener).toMatchObject({
      position: {
        x: 4,
        y: 5,
        z: 6
      }
    });
    expect(disposed.status).toBe("completed");
    expect(disposed.diagnostics.map((diagnostic) => diagnostic.code)).toContain("disposed-scene");
    expect(adapter.lifecycle).toBe("disposed");
    expect(snapshot.cues).toEqual([]);
  });
});
