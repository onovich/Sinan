import { describe, expect, test } from "vitest";
import { audioDiagnosticCodes } from "./audio-system-types";
import { clampUnitGain, createAudioCueRegistry, createDefaultAudioBuses } from "./audio-cue-registry";

describe("AudioCue registry and bus policy", () => {
  test("creates stable default buses with master routing", () => {
    const buses = createDefaultAudioBuses([
      {
        busId: "music",
        gain: 0.4,
        muted: true
      }
    ]);

    expect(buses.map((bus) => bus.busId)).toEqual(["master", "music", "effects", "ambience", "dialogue"]);
    expect(buses.find((bus) => bus.busId === "music")).toMatchObject({
      parentBusId: "master",
      gain: 0.4,
      muted: true
    });
    expect(buses.find((bus) => bus.busId === "effects")?.parentBusId).toBe("master");
  });

  test("normalizes cue gain, duration, timeline binding, and spatial intent", () => {
    const registry = createAudioCueRegistry([
      {
        cueId: "ui.confirm",
        assetId: "generated.confirm",
        busId: "effects",
        gain: 1.4,
        declaredDurationMs: -10,
        timeline: {
          timelineId: "timeline-1"
        },
        spatial: {
          mode: "position",
          position: {
            x: 1,
            y: 2,
            z: 3
          }
        }
      }
    ]);

    const cue = registry.getCue("ui.confirm");

    expect(cue.ok).toBe(true);
    expect(cue.value).toMatchObject({
      cueId: "ui.confirm",
      assetId: "generated.confirm",
      busId: "effects",
      gain: 1,
      loop: false,
      declaredDurationMs: 0,
      timeline: {
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
    });
  });

  test("returns structured diagnostics for missing cue, unknown bus, invalid gain, and invalid duration", () => {
    const registry = createAudioCueRegistry();
    const missingCue = registry.getCue("missing-cue");
    const unknownBus = registry.getBus("cinematic");
    const invalidCue = registry.normalizeCue({
      cueId: "invalid",
      assetId: "generated.invalid",
      busId: "unknown-bus",
      gain: -0.5,
      declaredDurationMs: Number.NaN
    });

    expect(missingCue.ok).toBe(false);
    expect(missingCue.diagnostics[0]?.code).toBe("invalid-cue");
    expect(unknownBus.ok).toBe(false);
    expect(unknownBus.diagnostics[0]?.code).toBe("unknown-bus");
    expect(invalidCue.ok).toBe(true);
    expect(invalidCue.value?.busId).toBe("master");
    expect(invalidCue.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["unknown-bus", "invalid-gain", "invalid-duration"]);
  });

  test("keeps cue and bus policy independent from browser audio objects", () => {
    const registry = createAudioCueRegistry([
      {
        cueId: "ambient.loop",
        assetId: "generated.ambient",
        busId: "ambience",
        loop: true,
        spatial: {
          mode: "entity",
          entityId: "entity-1"
        }
      }
    ]);

    expect(clampUnitGain(2)).toBe(1);
    expect(audioDiagnosticCodes).toContain("unknown-bus");
    expect(JSON.stringify({ cues: registry.listCues(), buses: registry.listBuses() })).not.toMatch(
      /AudioContext|GainNode|PannerNode|AudioBufferSourceNode|HTMLAudio|decodeAudioData/i
    );
  });
});
