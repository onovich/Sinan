import { describe, expect, it } from 'vitest';

import openGateTimelineJson from '../../data/timelines/tl_open_gate.json';
import { EventSystem } from '../events/EventSystem';
import { createEventRuntimeState, type DirectorCommand } from '../events/types';
import type { WebRuntime } from '../runtime/WebRuntime';
import { TimelineSchema, type TimelineData } from '../schemas/timeline.schema';
import { DirectorSystem, type DirectorSystemContext } from './DirectorSystem';

const openGateTimeline = TimelineSchema.parse(openGateTimelineJson);

describe('DirectorSystem', () => {
  it('plays tl_open_gate tracks and fires timeline.finished events', () => {
    const runtimeCalls: string[] = [];
    const context = createDirectorContext(createRuntimeMock(runtimeCalls));
    const director = new DirectorSystem(
      createTimelineLookup(openGateTimeline),
      new EventSystem([
        {
          schemaVersion: 1,
          id: 'ev_timeline_finished',
          trigger: { type: 'timeline.finished', timelineId: 'tl_open_gate' },
          actions: [
            {
              type: 'flag.set',
              flag: 'timeline_done',
              value: true,
            },
          ],
        },
      ]),
    );

    context.directorCommands.push({ type: 'timeline.play', timelineId: 'tl_open_gate' });
    director.update(0.5, context);
    director.update(4, context);

    expect(runtimeCalls).toEqual(['play gate_a Open']);
    expect(context.state.flags.gate_a_opened).toBe(true);
    expect(context.state.flags.timeline_done).toBe(true);
    expect(context.directorCommands).toEqual(
      expect.arrayContaining<DirectorCommand>([
        {
          type: 'camera.shot.play',
          shotId: 'cam_gate_reveal',
          duration: 3.5,
          blendIn: 0.25,
          blendOut: 0.4,
        },
        { type: 'sound.play', soundId: 'audio.switch_click' },
        { type: 'subtitle.show', text: 'Gate open.', duration: 2 },
      ]),
    );
    expect(director.getLastFinishedEventIds()).toEqual(['ev_timeline_finished']);
  });

  it('scrubs preview-safe tracks without runtime-only action side effects', () => {
    const runtimeCalls: string[] = [];
    const context = createDirectorContext(createRuntimeMock(runtimeCalls));
    const director = new DirectorSystem(createTimelineLookup(openGateTimeline));

    director.scrub('tl_open_gate', 4, context);

    expect(context.state.flags.gate_a_opened).toBeUndefined();
    expect(runtimeCalls).toEqual(['time gate_a Open 3.6']);
    expect(context.directorCommands).toEqual([
      { type: 'camera.shot.sample', shotId: 'cam_gate_reveal', time: 3.5 },
    ]);
    expect(director.getLastPropertySamples()).toEqual([
      {
        target: 'gate_a',
        property: 'Door.openAmount',
        value: 1,
      },
    ]);
  });
});

function createTimelineLookup(timeline: TimelineData): Record<string, TimelineData> {
  return { [timeline.id]: timeline };
}

function createDirectorContext(runtime: WebRuntime): DirectorSystemContext {
  return {
    state: createEventRuntimeState(),
    runtime,
    directorCommands: [],
  };
}

function createRuntimeMock(calls: string[]): WebRuntime {
  return {
    init: () => undefined,
    loadModel: () => Promise.resolve({ assetId: 'mock' }),
    instantiateModel: (_assetId, entityId) => ({ entityId, runtimeObjectId: entityId }),
    createEmpty: (entityId) => ({ entityId, runtimeObjectId: entityId }),
    destroyObject: () => undefined,
    setTransform: () => undefined,
    getTransform: () => null,
    setVisible: () => undefined,
    playAnimation: (options) => {
      calls.push(`play ${options.entityId} ${options.clip}`);
    },
    stopAnimation: () => undefined,
    setAnimationTime: (options) => {
      calls.push(`time ${options.entityId} ${options.clip} ${options.time}`);
    },
    pick: () => null,
    attachTransformGizmo: () => undefined,
    detachTransformGizmo: () => undefined,
    setTransformGizmoMode: () => undefined,
    update: () => undefined,
    render: () => undefined,
    resize: () => undefined,
    dispose: () => undefined,
  };
}
