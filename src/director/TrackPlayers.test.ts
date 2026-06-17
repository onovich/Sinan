import { describe, expect, it } from 'vitest';

import { ActionRegistry } from '../events/actionRegistry';
import { ActionSystem } from '../events/ActionSystem';
import { createEventRuntimeState, type ActionExecutionContext } from '../events/types';
import type { WebRuntime } from '../runtime/WebRuntime';
import { ActionTrackPlayer, type ActionTimelineTrackData } from './ActionTrackPlayer';
import { AnimationTrackPlayer, type AnimationTimelineTrackData } from './AnimationTrackPlayer';

describe('ActionTrackPlayer', () => {
  it('dispatches action markers during playback', () => {
    const context = createActionContext();
    const track: ActionTimelineTrackData = {
      id: 'track_set_flag',
      type: 'action',
      time: 1,
      action: {
        type: 'flag.set',
        flag: 'gate_a_opened',
        value: true,
      },
    };

    new ActionTrackPlayer().play(track, context);

    expect(context.state.flags.gate_a_opened).toBe(true);
  });

  it('skips runtime-only actions during scrub', () => {
    const context = createActionContext();
    const track: ActionTimelineTrackData = {
      id: 'track_set_flag',
      type: 'action',
      time: 1,
      action: {
        type: 'flag.set',
        flag: 'gate_a_opened',
        value: true,
      },
    };

    const executed = new ActionTrackPlayer().scrub(track, context);

    expect(executed).toBe(false);
    expect(context.state.flags.gate_a_opened).toBeUndefined();
  });

  it('allows preview-safe actions during scrub', () => {
    const context = createActionContext();
    const track: ActionTimelineTrackData = {
      id: 'track_preview_visible',
      type: 'action',
      time: 1,
      action: {
        type: 'entity.setVisible',
        entityId: 'gate_a',
        visible: false,
      },
    };

    const executed = new ActionTrackPlayer().scrub(track, context);

    expect(executed).toBe(true);
    expect(context.state.entityVisibility.gate_a).toBe(false);
  });

  it('skips destructive custom action registrations during scrub', () => {
    const context = createActionContext();
    const registry = new ActionRegistry();
    registry.register(
      'flag.set',
      (action, actionContext) => {
        if (action.type === 'flag.set') {
          actionContext.state.flags[action.flag] = action.value;
        }
      },
      { sideEffect: 'destructive' },
    );
    const track: ActionTimelineTrackData = {
      id: 'track_destructive',
      type: 'action',
      time: 1,
      action: {
        type: 'flag.set',
        flag: 'deleted',
        value: true,
      },
    };

    const executed = new ActionTrackPlayer(new ActionSystem(registry)).scrub(track, context);

    expect(executed).toBe(false);
    expect(context.state.flags.deleted).toBeUndefined();
  });
});

describe('AnimationTrackPlayer', () => {
  it('routes play and scrub through WebRuntime animation methods', () => {
    const calls: string[] = [];
    const runtime = createRuntimeMock(calls);
    const track: AnimationTimelineTrackData = {
      id: 'track_gate_open_anim',
      type: 'animation.play',
      start: 0.4,
      entityId: 'gate_a',
      clip: 'Open',
      loop: false,
      fadeIn: 0.1,
      fadeOut: 0.2,
    };
    const player = new AnimationTrackPlayer();

    player.play(track, runtime);
    player.scrub(track, runtime, 1.4);

    expect(calls).toEqual([
      'play gate_a Open loop=false fadeIn=0.1 fadeOut=0.2',
      'time gate_a Open 1',
    ]);
  });
});

function createActionContext(): ActionExecutionContext {
  return {
    state: createEventRuntimeState(),
    runtime: {
      setVisible: () => undefined,
    },
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
      calls.push(
        `play ${options.entityId} ${options.clip} loop=${String(options.loop)} fadeIn=${String(
          options.fadeIn,
        )} fadeOut=${String(options.fadeOut)}`,
      );
    },
    stopAnimation: (options) => {
      calls.push(`stop ${options.entityId} ${options.clip ?? '*'}`);
    },
    setAnimationTime: (options) => {
      calls.push(`time ${options.entityId} ${options.clip} ${options.time}`);
    },
    setCameraPose: () => undefined,
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
