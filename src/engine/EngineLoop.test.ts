import { describe, expect, it } from 'vitest';

import { EngineLoop } from './EngineLoop';

describe('EngineLoop', () => {
  it('runs update before render with the active mode', () => {
    const calls: string[] = [];
    const loop = new EngineLoop(
      {
        update: (context) =>
          calls.push(`update:${context.mode}:${context.deltaSeconds}:${context.elapsedSeconds}`),
        render: (context) =>
          calls.push(`render:${context.mode}:${context.deltaSeconds}:${context.elapsedSeconds}`),
      },
      'preview',
    );

    loop.step(0.016);

    expect(calls).toEqual(['update:preview:0.016:0.016', 'render:preview:0.016:0.016']);
  });

  it('clamps negative delta and ignores steps after dispose', () => {
    const calls: number[] = [];
    const loop = new EngineLoop({
      update: (context) => calls.push(context.deltaSeconds),
    });

    loop.step(-1);
    loop.dispose();
    loop.step(1);

    expect(calls).toEqual([0]);
    expect(loop.isDisposed()).toBe(true);
  });

  it('tracks elapsed time through the same clamped delta source', () => {
    const calls: Array<{ deltaSeconds: number; elapsedSeconds: number }> = [];
    const loop = new EngineLoop(
      {
        update: (context) =>
          calls.push({
            deltaSeconds: context.deltaSeconds,
            elapsedSeconds: context.elapsedSeconds,
          }),
      },
      'edit',
      { maxDeltaSeconds: 0.1 },
    );

    loop.step(0.04);
    loop.step(0.5);
    loop.step(-1);

    expect(calls[0]).toEqual({ deltaSeconds: 0.04, elapsedSeconds: 0.04 });
    expect(calls[1]?.deltaSeconds).toBe(0.1);
    expect(calls[1]?.elapsedSeconds).toBeCloseTo(0.14);
    expect(calls[2]?.deltaSeconds).toBe(0);
    expect(calls[2]?.elapsedSeconds).toBeCloseTo(0.14);
  });

  it('runs scheduled frames through the same update/render order', () => {
    const calls: string[] = [];
    const callbacks: Array<(timeMs: number) => void> = [];
    const cancelled: number[] = [];
    const loop = new EngineLoop({
      update: (context) => calls.push(`update:${context.deltaSeconds}:${context.elapsedSeconds}`),
      render: (context) => calls.push(`render:${context.deltaSeconds}:${context.elapsedSeconds}`),
    });

    loop.start({
      cancelFrame: (handle) => cancelled.push(handle),
      now: () => 1000,
      requestFrame: (callback) => {
        callbacks.push(callback);

        return callbacks.length;
      },
    });

    callbacks[0]?.(1040);
    loop.stop();
    callbacks[1]?.(1080);

    expect(calls).toEqual(['update:0.04:0.04', 'render:0.04:0.04']);
    expect(cancelled).toEqual([2]);
  });
});
