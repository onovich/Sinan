import { describe, expect, test } from "vitest";
import { runWebAudioSmoke } from "./web-audio-smoke";

class FakeAudioParam {
  value = 0;
}

class FakeAudioNode {
  readonly connections: unknown[] = [];

  connect(target: unknown): unknown {
    this.connections.push(target);
    return target;
  }
}

class FakeGainNode extends FakeAudioNode {
  gain = new FakeAudioParam();
}

class FakePannerNode extends FakeAudioNode {
  panningModel: PanningModelType = "equalpower";
  distanceModel: DistanceModelType = "inverse";
  positionX = new FakeAudioParam();
  positionY = new FakeAudioParam();
  positionZ = new FakeAudioParam();
}

class FakeAudioBufferSourceNode extends FakeAudioNode {
  buffer: AudioBuffer | null = null;
  startedAt: number | undefined;

  start(when?: number): void {
    this.startedAt = when;
  }
}

class FakeAudioContext {
  currentTime = 0;
  destination = new FakeAudioNode() as unknown as AudioDestinationNode;
  sampleRate = 48000;
  state: AudioContextState = "suspended";

  createGain(): GainNode {
    return new FakeGainNode() as unknown as GainNode;
  }

  createPanner(): PannerNode {
    return new FakePannerNode() as unknown as PannerNode;
  }

  createBuffer(): AudioBuffer {
    return {} as AudioBuffer;
  }

  createBufferSource(): AudioBufferSourceNode {
    return new FakeAudioBufferSourceNode() as unknown as AudioBufferSourceNode;
  }

  async resume(): Promise<void> {
    this.state = "running";
  }
}

describe("Web Audio smoke", () => {
  test("unlocks, creates mixer/spatial nodes, and schedules a one-shot cue", async () => {
    const result = await runWebAudioSmoke({
      AudioContextCtor: FakeAudioContext as unknown as new () => AudioContext
    });

    expect(result.supported).toBe(true);
    expect(result.unlockAttempted).toBe(true);
    expect(result.stateBefore).toBe("suspended");
    expect(result.stateAfter).toBe("running");
    expect(result.mixerCreated).toBe(true);
    expect(result.spatialNodeCreated).toBe(true);
    expect(result.oneShotScheduled).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });
});
