import { describe, expect, it } from 'vitest';

import type { ProjectData } from '../data/DataRepository';
import type { TransformData } from '../schemas/transform.schema';
import { EngineSession } from './EngineSession';

const transform: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

describe('EngineSession', () => {
  it('loads project data into a renderer-neutral world', () => {
    const session = new EngineSession({ runtime: createRuntimeProbe([]) });
    const world = session.loadProject(createProject());

    expect(session.getStatus()).toBe('loaded');
    expect(session.getWorld()).toBe(world);
    expect(world.snapshot()).toMatchObject({
      entityCount: 1,
      levelId: 'level_01',
    });
  });

  it('delegates frame update and render through EngineLoop', () => {
    const calls: string[] = [];
    const session = new EngineSession({
      mode: 'play',
      runtime: createRuntimeProbe(calls),
    });

    session.step(0.05);

    expect(calls).toEqual(['update:0.05', 'render']);
  });

  it('supports mode changes and idempotent disposal', () => {
    const calls: string[] = [];
    const session = new EngineSession({ runtime: createRuntimeProbe(calls) });

    session.setMode('showcase');
    session.dispose();
    session.dispose();

    expect(session.getMode()).toBe('showcase');
    expect(session.getStatus()).toBe('disposed');
    expect(calls).toEqual(['dispose']);
    expect(() => session.step(0.016)).toThrow('EngineSession has been disposed.');
  });
});

function createRuntimeProbe(calls: string[]) {
  return {
    dispose: () => calls.push('dispose'),
    render: () => calls.push('render'),
    update: (deltaSeconds: number) => calls.push(`update:${deltaSeconds}`),
  };
}

function createProject(): ProjectData {
  return {
    assets: {
      schemaVersion: 1,
      assets: {},
    },
    level: {
      schemaVersion: 1,
      id: 'level_01',
      name: 'Gate Demo',
      entities: [
        {
          id: 'switch_a',
          transform,
          components: {},
        },
      ],
      events: [],
      timelines: [],
      cameraShots: [],
    },
    prefabs: {},
    palettes: {},
    events: {},
    timelines: {},
    cameraShots: {},
  };
}
