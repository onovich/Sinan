import { createAudioCueRegistry } from "./audio-cue-registry";
import { createWebAudioSystemAdapter } from "./web-audio-system-adapter";
import type { AudioCommand, AudioJsonObject } from "./audio-system-types";

export interface AudioSystemBrowserSmokeResult {
  adapter: "WebAudioSystemAdapter";
  supported: boolean;
  bootOk: boolean;
  unlockOk: boolean;
  preloadOk: boolean;
  playOk: boolean;
  completionOk: boolean;
  spatialOk: boolean;
  busOk: boolean;
  listenerOk: boolean;
  fallbackOk: boolean;
  disposeOk: boolean;
  contractClean: boolean;
  statuses: Record<string, string>;
  diagnostics: string[];
}

function command(type: AudioCommand["type"], payload: AudioJsonObject = {}, overrides: Partial<AudioCommand> = {}): AudioCommand {
  return {
    commandId: `${type}-${Date.now()}`,
    type,
    submittedAt: Date.now(),
    payload,
    ...overrides
  };
}

function createFixtureRegistry() {
  return createAudioCueRegistry([
    {
      cueId: "browser-chime",
      assetId: "asset:browser/chime.wav",
      busId: "effects",
      declaredDurationMs: 80,
      gain: 0.4,
      timeline: {
        timelineId: "browser-smoke",
        blocking: "until-complete",
        completionPolicy: "declared-duration"
      },
      spatial: {
        mode: "position",
        position: {
          x: 0,
          y: 0,
          z: -1
        }
      }
    }
  ]);
}

function createEmptyResult(): AudioSystemBrowserSmokeResult {
  return {
    adapter: "WebAudioSystemAdapter",
    supported: typeof AudioContext !== "undefined" || typeof (globalThis as { webkitAudioContext?: unknown }).webkitAudioContext !== "undefined",
    bootOk: false,
    unlockOk: false,
    preloadOk: false,
    playOk: false,
    completionOk: false,
    spatialOk: false,
    busOk: false,
    listenerOk: false,
    fallbackOk: false,
    disposeOk: false,
    contractClean: false,
    statuses: {},
    diagnostics: []
  };
}

export async function runAudioSystemBrowserSmoke(): Promise<AudioSystemBrowserSmokeResult> {
  const result = createEmptyResult();
  if (!result.supported) {
    result.diagnostics.push("Browser audio output is not available in this environment.");
    return result;
  }

  const registry = createFixtureRegistry();
  const adapter = createWebAudioSystemAdapter({
    registry,
    config: {
      unlockPolicy: "require-user-gesture"
    },
    decodeAsset: async (_assetId, context) => {
      if (!context.createBuffer) {
        throw new Error("Audio buffer factory is unavailable.");
      }
      return context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * 0.02)), context.sampleRate);
    }
  });
  const fallbackAdapter = createWebAudioSystemAdapter({
    registry,
    decodeAsset: async () => {
      throw new Error("fixture decode failure");
    }
  });

  try {
    const boot = await adapter.boot();
    const unlock = await adapter.unlock(command("unlock"));
    const preload = await adapter.preload(command("preload", {}, { cueId: "browser-chime" }));
    const play = await adapter.play(command("play", {}, { cueId: "browser-chime" }));
    const gain = await adapter.setBusGain(
      command(
        "set-bus-gain",
        {
          gain: 0.3
        },
        {
          busId: "effects"
        }
      )
    );
    const muted = await adapter.setBusMuted(
      command(
        "set-bus-muted",
        {
          muted: false
        },
        {
          busId: "effects"
        }
      )
    );
    const listener = await adapter.setListenerTransform(
      command("set-listener-transform", {
        listener: {
          position: {
            x: 1,
            y: 2,
            z: 3
          }
        }
      })
    );
    const fallback = await fallbackAdapter.play(command("play", {}, { cueId: "browser-chime" }));
    const dispose = await adapter.disposeSceneAudio(command("dispose-scene", {}, { sceneId: "browser-smoke-scene" }));
    const snapshot = await adapter.snapshot();

    result.statuses = {
      boot: boot.status,
      unlock: unlock.status,
      preload: preload.status,
      play: play.status,
      gain: gain.status,
      muted: muted.status,
      listener: listener.status,
      fallback: fallback.status,
      dispose: dispose.status
    };
    result.bootOk = boot.ok && boot.status === "accepted";
    result.unlockOk = unlock.ok && unlock.value?.lifecycle === "running";
    result.preloadOk = preload.ok && preload.value?.decoded === true;
    result.playOk = play.ok && play.status === "accepted";
    result.completionOk = play.durationMs === 80 && play.events.some((event) => event.type === "completed");
    result.spatialOk = play.value?.spatial === "position";
    result.busOk = gain.value?.gain === 0.3 && muted.value?.muted === false;
    result.listenerOk = listener.value?.listener !== undefined;
    result.fallbackOk = fallback.status === "fallback" && fallback.diagnostics.some((diagnostic) => diagnostic.code === "decode-failure");
    result.disposeOk = dispose.status === "completed" && adapter.lifecycle === "disposed";
    result.contractClean = !/AudioContext|GainNode|PannerNode|AudioBufferSourceNode|HTMLAudio|decodeAudioData/i.test(
      JSON.stringify({
        boot,
        unlock,
        preload,
        play,
        gain,
        muted,
        listener,
        fallback,
        dispose,
        snapshot
      })
    );
    result.diagnostics.push(
      ...Object.entries(result.statuses).map(([key, value]) => `${key}: ${value}`),
      `completion events: ${play.events.map((event) => event.type).join(",")}`,
      `fallback diagnostics: ${fallback.diagnostics.map((diagnostic) => diagnostic.code).join(",")}`,
      `snapshot lifecycle after dispose: ${snapshot.lifecycle}`,
      "AudioSystem contract -> WebAudioSystemAdapter -> browser audio output"
    );
  } catch (error) {
    result.diagnostics.push(error instanceof Error ? error.message : String(error));
  } finally {
    try {
      await adapter.disposeSceneAudio(command("dispose-scene", {}, { sceneId: "browser-smoke-cleanup" }));
    } catch (error) {
      result.diagnostics.push(error instanceof Error ? error.message : String(error));
    }
    try {
      await fallbackAdapter.disposeSceneAudio(command("dispose-scene", {}, { sceneId: "browser-smoke-fallback-cleanup" }));
    } catch (error) {
      result.diagnostics.push(error instanceof Error ? error.message : String(error));
    }
  }

  return result;
}
