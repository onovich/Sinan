export interface WebAudioSmokeResult {
  supported: boolean;
  unlockAttempted: boolean;
  stateBefore?: AudioContextState;
  stateAfter?: AudioContextState;
  mixerCreated: boolean;
  spatialNodeCreated: boolean;
  oneShotScheduled: boolean;
  diagnostics: string[];
}

export interface WebAudioSmokeOptions {
  AudioContextCtor?: new () => AudioContext;
}

function getGlobalAudioContext(): (new () => AudioContext) | undefined {
  const scope = globalThis as typeof globalThis & {
    webkitAudioContext?: new () => AudioContext;
  };

  return scope.AudioContext ?? scope.webkitAudioContext;
}

export function detectWebAudioSupport(): boolean {
  return getGlobalAudioContext() !== undefined;
}

export async function runWebAudioSmoke(options: WebAudioSmokeOptions = {}): Promise<WebAudioSmokeResult> {
  const AudioContextCtor = options.AudioContextCtor ?? getGlobalAudioContext();
  if (!AudioContextCtor) {
    return {
      supported: false,
      unlockAttempted: false,
      mixerCreated: false,
      spatialNodeCreated: false,
      oneShotScheduled: false,
      diagnostics: ["AudioContext is not available in this environment."]
    };
  }

  const diagnostics: string[] = [];
  const context = new AudioContextCtor();
  const stateBefore = context.state;

  try {
    if (context.state !== "running") {
      await context.resume();
    }
  } catch (error) {
    diagnostics.push(error instanceof Error ? error.message : String(error));
  }

  const masterGain = context.createGain();
  masterGain.gain.value = 0.8;
  const sfxGain = context.createGain();
  sfxGain.gain.value = 0.5;
  sfxGain.connect(masterGain);
  masterGain.connect(context.destination);

  const panner = context.createPanner();
  panner.panningModel = "HRTF";
  panner.distanceModel = "inverse";
  panner.positionX.value = 0;
  panner.positionY.value = 0;
  panner.positionZ.value = -1;
  panner.connect(sfxGain);

  const sampleRate = context.sampleRate || 48000;
  const buffer = context.createBuffer(1, Math.max(1, Math.floor(sampleRate * 0.01)), sampleRate);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(panner);
  source.start(context.currentTime);

  return {
    supported: true,
    unlockAttempted: true,
    stateBefore,
    stateAfter: context.state,
    mixerCreated: true,
    spatialNodeCreated: true,
    oneShotScheduled: true,
    diagnostics
  };
}
