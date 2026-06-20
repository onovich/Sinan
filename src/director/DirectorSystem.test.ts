import { describe, expect, it } from 'vitest';

import gateRevealCameraShotJson from '../../data/cameraShots/cam_gate_reveal.json';
import openGateTimelineJson from '../../data/timelines/tl_open_gate.json';
import { EventSystem } from '../events/EventSystem';
import { createEventRuntimeState, type DirectorCommand } from '../events/types';
import type { RuntimeCameraPose } from '../runtime/RuntimeTypes';
import type { WebRuntime } from '../runtime/WebRuntime';
import { CameraShotSchema } from '../schemas/cameraShot.schema';
import { TimelineSchema, type TimelineData } from '../schemas/timeline.schema';
import { DirectorSystem, type DirectorSystemContext } from './DirectorSystem';

const openGateTimeline = TimelineSchema.parse(openGateTimelineJson);
const gateRevealCameraShot = CameraShotSchema.parse(gateRevealCameraShotJson);

describe('DirectorSystem', () => {
  it('plays tl_open_gate tracks and fires timeline.finished events', () => {
    const runtimeCalls: string[] = [];
    const cameraPoses: RuntimeCameraPose[] = [];
    const context = createDirectorContext(createRuntimeMock(runtimeCalls, cameraPoses));
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
      { [gateRevealCameraShot.id]: gateRevealCameraShot },
    );

    context.directorCommands.push({ type: 'timeline.play', timelineId: 'tl_open_gate' });
    director.update(0.5, context);
    director.update(4, context);

    expect(runtimeCalls).toEqual(['play gate_a Open', 'material gate_a main progress 0.0625']);
    expect(cameraPoses.length).toBeGreaterThan(0);
    expect(cameraPoses[0]).toMatchObject({
      fov: 55,
      lookAt: [4, 1.2, 8],
    });
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
    const cameraPoses: RuntimeCameraPose[] = [];
    const context = createDirectorContext(createRuntimeMock(runtimeCalls, cameraPoses));
    const director = new DirectorSystem(
      createTimelineLookup(openGateTimeline),
      new EventSystem([]),
      { [gateRevealCameraShot.id]: gateRevealCameraShot },
    );

    director.scrub('tl_open_gate', 4, context);

    expect(context.state.flags.gate_a_opened).toBeUndefined();
    expect(runtimeCalls).toEqual(['time gate_a Open 3.6', 'material gate_a main progress 1']);
    expect(cameraPoses.at(-1)).toMatchObject({
      fov: 38,
      lookAt: [5, 1, 8],
    });
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
    expect(director.getLastMaterialParameterSamples()).toEqual([
      {
        target: 'gate_a',
        slot: 'main',
        parameter: 'progress',
        value: 1,
      },
    ]);
  });

  it('keeps preview playback from running runtime-only action side effects', () => {
    const runtimeCalls: string[] = [];
    const cameraPoses: RuntimeCameraPose[] = [];
    const context = {
      ...createDirectorContext(createRuntimeMock(runtimeCalls, cameraPoses)),
      previewMode: true,
    };
    const director = new DirectorSystem(
      createTimelineLookup(openGateTimeline),
      new EventSystem([]),
      { [gateRevealCameraShot.id]: gateRevealCameraShot },
    );

    director.playTimeline('tl_open_gate');
    director.update(4, context);

    expect(director.getTimelineStatus('tl_open_gate')).toBe('playing');
    expect(context.state.flags.gate_a_opened).toBeUndefined();
    expect(context.directorCommands).toEqual(
      expect.arrayContaining<DirectorCommand>([
        { type: 'sound.play', soundId: 'audio.switch_click' },
        { type: 'subtitle.show', text: 'Gate open.', duration: 2 },
      ]),
    );
  });

  it('drives material parameter tracks during playback and scrub', () => {
    const runtimeCalls: string[] = [];
    const cameraPoses: RuntimeCameraPose[] = [];
    const context = createDirectorContext(createRuntimeMock(runtimeCalls, cameraPoses));
    const timeline: TimelineData = {
      schemaVersion: 1,
      id: 'tl_material',
      duration: 2,
      tracks: [
        {
          id: 'track_gate_dissolve_progress',
          type: 'material.parameter',
          target: 'gate_a',
          slot: 'main',
          parameter: 'progress',
          keys: [
            { time: 0, value: 0 },
            { time: 2, value: 1 },
          ],
        },
      ],
    };
    const director = new DirectorSystem(createTimelineLookup(timeline));

    director.playTimeline('tl_material');
    director.update(1, context);
    director.update(0.5, context);

    expect(runtimeCalls).toEqual([
      'material gate_a main progress 0.5',
      'material gate_a main progress 0.75',
    ]);
    expect(director.getLastMaterialParameterSamples()).toEqual([
      {
        target: 'gate_a',
        slot: 'main',
        parameter: 'progress',
        value: 0.75,
      },
    ]);

    runtimeCalls.length = 0;
    director.scrub('tl_material', 0.4, context);

    expect(runtimeCalls).toEqual(['material gate_a main progress 0.2']);
    expect(director.getLastMaterialParameterSamples()).toEqual([
      {
        target: 'gate_a',
        slot: 'main',
        parameter: 'progress',
        value: 0.2,
      },
    ]);
  });

  it('keeps material parameter sampling deterministic without a runtime binding', () => {
    const timeline: TimelineData = {
      schemaVersion: 1,
      id: 'tl_material',
      duration: 1,
      tracks: [
        {
          id: 'track_missing_gate',
          type: 'material.parameter',
          target: 'missing_gate',
          slot: 'main',
          parameter: 'progress',
          keys: [
            { time: 0, value: 0 },
            { time: 1, value: 1 },
          ],
        },
      ],
    };
    const director = new DirectorSystem(createTimelineLookup(timeline));
    const context: DirectorSystemContext = {
      state: createEventRuntimeState(),
      directorCommands: [],
    };

    director.scrub('tl_material', 0.5, context);

    expect(director.getLastMaterialParameterSamples()).toEqual([
      {
        target: 'missing_gate',
        slot: 'main',
        parameter: 'progress',
        value: 0.5,
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

function createRuntimeMock(calls: string[], cameraPoses: RuntimeCameraPose[]): WebRuntime {
  return {
    init: () => undefined,
    loadModel: () => Promise.resolve({ assetId: 'mock' }),
    instantiateModel: (_assetId, entityId) => ({ entityId, runtimeObjectId: entityId }),
    createEmpty: (entityId) => ({ entityId, runtimeObjectId: entityId }),
    destroyObject: () => undefined,
    setTransform: () => undefined,
    getTransform: (entityId) =>
      entityId === 'gate_a'
        ? {
            position: [5, 1, 8],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          }
        : null,
    setVisible: () => undefined,
    playAnimation: (options) => {
      calls.push(`play ${options.entityId} ${options.clip}`);
    },
    stopAnimation: () => undefined,
    setAnimationTime: (options) => {
      calls.push(`time ${options.entityId} ${options.clip} ${options.time}`);
    },
    setCameraPose: (pose) => {
      cameraPoses.push(pose);
    },
    setDebugAabb: () => undefined,
    setMaterialParameter: (update) => {
      calls.push(
        `material ${update.entityId} ${update.slot} ${update.parameter} ${String(update.value)}`,
      );
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
