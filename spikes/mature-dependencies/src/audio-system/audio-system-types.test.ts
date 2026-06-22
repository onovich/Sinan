import { describe, expect, test } from "vitest";
import {
  audioCommandStatuses,
  audioDiagnosticCodes,
  audioLifecycleStates,
  createAudioCommandResult,
  createAudioDiagnostic,
  type AudioBusSpec,
  type AudioCommand,
  type AudioCueSpec,
  type AudioSnapshot,
  type AudioSystem,
  type AudioSystemConfig
} from "./audio-system-types";

const buses: AudioBusSpec[] = [
  {
    busId: "master",
    gain: 1,
    muted: false
  },
  {
    busId: "effects",
    parentBusId: "master",
    gain: 0.8,
    muted: false
  }
];

const config: AudioSystemConfig = {
  adapterId: "audio-system-contract-test",
  lifecycle: "silent",
  unlockPolicy: "silent-until-unlocked",
  defaultBusId: "effects",
  buses,
  preferences: {
    masterVolume: 1,
    muted: false,
    busVolumes: {
      effects: 0.8
    },
    busMutes: {},
    captionsEnabled: false
  },
  diagnosticsLevel: "verbose"
};

const cue: AudioCueSpec = {
  cueId: "contract.cue",
  assetId: "generated.click",
  busId: "effects",
  gain: 0.75,
  loop: false,
  declaredDurationMs: 120,
  timeline: {
    timelineId: "timeline-1",
    blocking: "until-complete",
    completionPolicy: "declared-duration"
  },
  spatial: {
    mode: "position",
    position: {
      x: 0,
      y: 1,
      z: -2
    }
  }
};

function command(type: AudioCommand["type"]): AudioCommand {
  return {
    commandId: `command.${type}`,
    type,
    submittedAt: 1,
    cueId: cue.cueId,
    assetId: cue.assetId,
    busId: cue.busId,
    payload: {}
  };
}

describe("AudioSystem contract types", () => {
  test("defines Sinan-owned lifecycle, command status, and diagnostic vocabularies", () => {
    expect(audioLifecycleStates).toEqual(["unsupported", "locked", "running", "suspended", "degraded", "silent", "disposed"]);
    expect(audioCommandStatuses).toEqual(["accepted", "queued", "ignored", "failed", "fallback", "completed"]);
    expect(audioDiagnosticCodes).toContain("unsupported-browser");
    expect(audioDiagnosticCodes).toContain("locked-context");
    expect(audioDiagnosticCodes).toContain("unlock-denied");
    expect(audioDiagnosticCodes).toContain("missing-asset");
    expect(audioDiagnosticCodes).toContain("decode-failure");
    expect(audioDiagnosticCodes).toContain("autoplay-denied");
    expect(audioDiagnosticCodes).toContain("interrupted-cue");
    expect(audioDiagnosticCodes).toContain("latency-warning");
    expect(audioDiagnosticCodes).toContain("spatial-target-missing");
    expect(audioDiagnosticCodes).toContain("silent-fallback");
    expect(audioDiagnosticCodes).toContain("disposed-scene");
  });

  test("keeps cue, bus, timeline, and spatial intent browser-object-free", () => {
    expect(cue).toMatchObject({
      cueId: "contract.cue",
      assetId: "generated.click",
      busId: "effects",
      declaredDurationMs: 120
    });
    expect(JSON.stringify({ cue, buses, config })).not.toMatch(/AudioContext|GainNode|PannerNode|AudioBufferSourceNode|HTMLAudio/i);
  });

  test("creates normalized diagnostics and command results", () => {
    const diagnostic = createAudioDiagnostic("locked-context", "Audio context is locked.", "warning", true, {
      unlockPolicy: "require-user-gesture"
    });
    const result = createAudioCommandResult("fallback", command("play"), {
      diagnostics: [diagnostic],
      durationMs: 1
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("fallback");
    expect(result.diagnostics[0]?.code).toBe("locked-context");
    expect(result.durationMs).toBe(1);
  });

  test("exposes an AudioSystem interface shape without Web Audio classes", async () => {
    const snapshot: AudioSnapshot = {
      lifecycle: "silent",
      buses,
      cues: [],
      listener: {
        position: { x: 0, y: 0, z: 0 },
        forward: { x: 0, y: 0, z: -1 },
        up: { x: 0, y: 1, z: 0 }
      },
      preferences: config.preferences,
      diagnostics: []
    };
    const system: AudioSystem = {
      config,
      lifecycle: "silent",
      boot: async () => createAudioCommandResult("fallback", command("unlock")),
      unlock: async (audioCommand) => createAudioCommandResult("fallback", audioCommand),
      preload: async (audioCommand) => createAudioCommandResult("queued", audioCommand),
      play: async (audioCommand) => createAudioCommandResult("completed", audioCommand),
      stop: async (audioCommand) => createAudioCommandResult("completed", audioCommand),
      pauseBus: async (audioCommand) => createAudioCommandResult("accepted", audioCommand),
      resumeBus: async (audioCommand) => createAudioCommandResult("accepted", audioCommand),
      setBusGain: async (audioCommand) => createAudioCommandResult("accepted", audioCommand),
      setBusMuted: async (audioCommand) => createAudioCommandResult("accepted", audioCommand),
      setListenerTransform: async (audioCommand) => createAudioCommandResult("accepted", audioCommand),
      disposeSceneAudio: async (audioCommand) => createAudioCommandResult("completed", audioCommand),
      snapshot: async () => snapshot
    };

    const result = await system.play(command("play"));
    const currentSnapshot = await system.snapshot();

    expect(result.status).toBe("completed");
    expect(currentSnapshot.listener.forward.z).toBe(-1);
    expect(JSON.stringify({ config: system.config, snapshot: currentSnapshot, result })).not.toMatch(
      /AudioContext|GainNode|PannerNode|AudioBufferSourceNode|HTMLAudio|decodeAudioData/i
    );
  });
});
