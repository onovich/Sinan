import { describe, expect, it } from 'vitest';

import { EngineLoop } from './EngineLoop';

describe('EngineLoop', () => {
  it('runs update before render with the active mode', () => {
    const calls: string[] = [];
    const loop = new EngineLoop(
      {
        update: (context) => calls.push(`update:${context.mode}:${context.deltaSeconds}`),
        render: (context) => calls.push(`render:${context.mode}:${context.deltaSeconds}`),
      },
      'preview',
    );

    loop.step(0.016);

    expect(calls).toEqual(['update:preview:0.016', 'render:preview:0.016']);
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
});
