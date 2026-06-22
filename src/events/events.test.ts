import { describe, expect, it } from 'vitest';

import { DeliveryJobRuntime } from '../game/delivery/DeliveryJobRuntime';
import { ActionSchema } from '../schemas/action.schema';
import { TYPED_CONDITION_TYPES } from '../schemas/condition.schema';
import type { DeliveryJobData } from '../schemas/delivery.schema';
import { ActionSystem } from './ActionSystem';
import { AabbTriggerSystem } from './AabbTriggerSystem';
import { ConditionSystem } from './ConditionSystem';
import { EventSystem } from './EventSystem';
import { TriggerSystem } from './TriggerSystem';
import { createDefaultActionRegistry } from './actionRegistry';
import { createDefaultConditionRegistry } from './conditionRegistry';
import { createDefaultTriggerRegistry } from './triggerRegistry';
import { createEventRuntimeState, type ActionExecutionContext } from './types';

describe('ConditionSystem', () => {
  it('evaluates recursive conditions', () => {
    const system = new ConditionSystem();
    const state = createEventRuntimeState({
      flags: { power_enabled: true },
      inventory: new Set(['gate_key']),
    });

    expect(
      system.evaluate(
        {
          all: [
            { type: 'flag.equals', flag: 'power_enabled', value: true },
            {
              not: {
                type: 'flag.equals',
                flag: 'gate_a_opened',
                value: true,
              },
            },
            { type: 'inventory.hasItem', itemId: 'gate_key' },
          ],
        },
        state,
      ),
    ).toBe(true);
  });

  it('evaluates distance and custom whitelist conditions', () => {
    const registry = createDefaultConditionRegistry();
    registry.registerCustomCondition('has.debug.flag', (params, state) => {
      return typeof params.flag === 'string' && state.flags[params.flag] === true;
    });
    const system = new ConditionSystem(registry);
    const state = createEventRuntimeState({
      flags: { debug_enabled: true },
      entityTransforms: {
        player_spawn_01: {
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
        switch_a: {
          position: [1.5, 0, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
      },
    });

    expect(
      system.evaluate(
        { type: 'distance.lessThan', entityA: 'player_spawn_01', entityB: 'switch_a', distance: 2 },
        state,
      ),
    ).toBe(true);
    expect(
      system.evaluate(
        { type: 'custom.condition', name: 'has.debug.flag', params: { flag: 'debug_enabled' } },
        state,
      ),
    ).toBe(true);
    expect(() =>
      system.evaluate({ type: 'custom.condition', name: 'missing.condition' }, state),
    ).toThrow('Condition function is not whitelisted: missing.condition');
  });

  it('evaluates delivery job status conditions from synchronized runtime state', () => {
    const system = new ConditionSystem();
    const state = createEventRuntimeState({
      activeDeliveryJobId: 'job.hill_mail_run',
      deliveryJobs: {
        'job.hill_mail_run': 'accepted',
      },
    });

    expect(
      system.evaluate(
        { type: 'delivery.statusEquals', jobId: 'job.hill_mail_run', status: 'accepted' },
        state,
      ),
    ).toBe(true);
    expect(
      system.evaluate({ type: 'delivery.activeJobEquals', jobId: 'job.hill_mail_run' }, state),
    ).toBe(true);
    expect(
      system.evaluate(
        { type: 'delivery.statusEquals', jobId: 'job.hill_mail_run', status: 'completed' },
        state,
      ),
    ).toBe(false);
  });
});

describe('ActionSystem', () => {
  it('dispatches schema-backed state, runtime, director, and custom actions', () => {
    const visibleCalls: Array<[string, boolean]> = [];
    const transformCalls: Array<[string, readonly number[]]> = [];
    const animationCalls: string[] = [];
    const materialCalls: string[] = [];
    const customCalls: Array<Readonly<Record<string, unknown>>> = [];
    const registry = createDefaultActionRegistry();
    registry.registerCustomFunction('debug.mark', (params, actionContext) => {
      customCalls.push(params);
      actionContext.state.flags.debug_marked = true;
    });
    const context: ActionExecutionContext = {
      state: createEventRuntimeState(),
      runtime: {
        setVisible: (entityId, visible) => {
          visibleCalls.push([entityId, visible]);
        },
        setTransform: (entityId, transform) => {
          transformCalls.push([entityId, transform.position]);
        },
        playAnimation: (options) => {
          animationCalls.push(`play ${options.entityId} ${options.clip}`);
        },
        stopAnimation: (options) => {
          animationCalls.push(`stop ${options.entityId} ${options.clip ?? '*'}`);
        },
        setMaterialParameter: (update) => {
          materialCalls.push(
            `${update.entityId} ${update.slot} ${update.parameter} ${String(update.value)}`,
          );
        },
      },
      directorCommands: [],
    };

    new ActionSystem(registry).dispatchAll(
      [
        { type: 'flag.set', flag: 'power_enabled', value: true },
        { type: 'flag.toggle', flag: 'gate_a_opened' },
        { type: 'entity.setVisible', entityId: 'gate_a', visible: false },
        { type: 'entity.setEnabled', entityId: 'gate_a', enabled: false },
        {
          type: 'entity.setTransform',
          entityId: 'gate_a',
          transform: {
            position: [1, 2, 3],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
        },
        {
          type: 'entity.animateTransform',
          entityId: 'gate_a',
          to: {
            position: [4, 5, 6],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
          duration: 1.25,
        },
        { type: 'door.open', entityId: 'gate_a' },
        { type: 'camera.playShot', shotId: 'cam_gate_reveal' },
        { type: 'animation.play', entityId: 'gate_a', clip: 'Open' },
        { type: 'animation.stop', entityId: 'gate_a', clip: 'Open' },
        { type: 'sound.play', soundId: 'audio.switch_click' },
        {
          type: 'material.setParameter',
          entityId: 'gate_a',
          slot: 'main',
          parameter: 'progress',
          value: 0.5,
        },
        { type: 'subtitle.show', text: 'Gate open.', duration: 2 },
        { type: 'timeline.play', timelineId: 'tl_open_gate' },
        { type: 'function.call', name: 'debug.mark', params: { source: 'test' } },
      ],
      context,
    );

    expect(context.state.flags.power_enabled).toBe(true);
    expect(context.state.flags.gate_a_opened).toBe(true);
    expect(context.state.flags.debug_marked).toBe(true);
    expect(context.state.entityVisibility.gate_a).toBe(false);
    expect(context.state.entityEnabled.gate_a).toBe(false);
    expect(context.state.entityTransforms.gate_a?.position).toEqual([1, 2, 3]);
    expect(context.state.doorStates.gate_a?.isOpen).toBe(true);
    expect(visibleCalls).toEqual([['gate_a', false]]);
    expect(transformCalls).toEqual([['gate_a', [1, 2, 3]]]);
    expect(animationCalls).toEqual(['play gate_a Open', 'stop gate_a Open']);
    expect(materialCalls).toEqual(['gate_a main progress 0.5']);
    expect(customCalls).toEqual([{ source: 'test' }]);
    expect(context.directorCommands).toEqual([
      {
        type: 'entity.animateTransform',
        entityId: 'gate_a',
        to: {
          position: [4, 5, 6],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
        duration: 1.25,
      },
      { type: 'camera.shot.play', shotId: 'cam_gate_reveal' },
      { type: 'sound.play', soundId: 'audio.switch_click' },
      { type: 'subtitle.show', text: 'Gate open.', duration: 2, speaker: undefined },
      { type: 'timeline.play', timelineId: 'tl_open_gate' },
    ]);
  });

  it('rejects unwhitelisted custom action functions', () => {
    const context: ActionExecutionContext = {
      state: createEventRuntimeState(),
      directorCommands: [],
    };

    expect(() =>
      new ActionSystem().dispatch({ type: 'function.call', name: 'missing.function' }, context),
    ).toThrow('Action function is not whitelisted: missing.function');
  });

  it('treats material parameter actions as preview safe', () => {
    expect(
      new ActionSystem().getSideEffect({
        type: 'material.setParameter',
        entityId: 'gate_a',
        slot: 'main',
        parameter: 'progress',
        value: 0.5,
      }),
    ).toBe('previewSafe');
  });

  it('dispatches typed delivery actions through the delivery job runtime', () => {
    const context = createDeliveryActionContext();

    new ActionSystem().dispatchAll(
      [
        {
          type: 'delivery.accept',
          jobId: 'job.hill_mail_run',
          endpointId: 'delivery.courier_hill',
        },
        { type: 'delivery.progress', jobId: 'job.hill_mail_run' },
        {
          type: 'delivery.deliver',
          jobId: 'job.hill_mail_run',
          endpointId: 'delivery.mailbox_hill',
        },
        {
          type: 'delivery.complete',
          jobId: 'job.hill_mail_run',
          endpointId: 'delivery.mailbox_hill',
        },
      ],
      context,
    );

    expect(context.state.deliveryJobs['job.hill_mail_run']).toBe('completed');
    expect(context.state.activeDeliveryJobId).toBeUndefined();
    expect(context.state.deliveryJobSequence).toBe(4);
  });

  it('rejects invalid delivery state and missing target transitions', () => {
    const invalidStateContext = createDeliveryActionContext();

    expect(() =>
      new ActionSystem().dispatch(
        {
          type: 'delivery.complete',
          jobId: 'job.hill_mail_run',
          endpointId: 'delivery.mailbox_hill',
        },
        invalidStateContext,
      ),
    ).toThrow('Delivery job "job.hill_mail_run" cannot be completed from available.');
    expect(invalidStateContext.state.deliveryJobs['job.hill_mail_run']).toBe('available');

    const missingTargetContext = createDeliveryActionContext();
    new ActionSystem().dispatchAll(
      [
        {
          type: 'delivery.accept',
          jobId: 'job.hill_mail_run',
          endpointId: 'delivery.courier_hill',
        },
        { type: 'delivery.progress', jobId: 'job.hill_mail_run' },
      ],
      missingTargetContext,
    );

    expect(() =>
      new ActionSystem().dispatch(
        {
          type: 'delivery.deliver',
          jobId: 'job.hill_mail_run',
          endpointId: 'delivery.missing_target',
        },
        missingTargetContext,
      ),
    ).toThrow('Delivery job "job.hill_mail_run" target endpoint is "delivery.mailbox_hill".');
    expect(missingTargetContext.state.deliveryJobs['job.hill_mail_run']).toBe('inProgress');
  });

  it('requires a delivery runtime for delivery actions', () => {
    const context: ActionExecutionContext = {
      state: createEventRuntimeState(),
      directorCommands: [],
    };

    expect(() =>
      new ActionSystem().dispatch(
        { type: 'delivery.progress', jobId: 'job.hill_mail_run' },
        context,
      ),
    ).toThrow('Delivery job runtime is required for action type: delivery.progress');
  });
});

describe('registries', () => {
  it('registers every schema-supported action type', () => {
    const actionRegistry = createDefaultActionRegistry();
    const schemaTypes = ActionSchema.options.map((option) => {
      const literal = option.shape.type as { def: { values: readonly string[] } };

      return literal.def.values[0];
    });

    expect(schemaTypes.filter((type) => !actionRegistry.has(type))).toEqual([]);
  });

  it('registers every typed condition exposed by the schema', () => {
    const conditionRegistry = createDefaultConditionRegistry();

    expect(TYPED_CONDITION_TYPES.filter((type) => !conditionRegistry.has(type))).toEqual([]);
  });

  it('registers MVP trigger types', () => {
    const triggerRegistry = createDefaultTriggerRegistry();

    expect(triggerRegistry.has('entity.interact')).toBe(true);
    expect(triggerRegistry.has('timeline.finished')).toBe(true);
  });
});

describe('EventSystem and TriggerSystem', () => {
  it('fires matching interact events when conditions pass', () => {
    const context: ActionExecutionContext = {
      state: createEventRuntimeState({
        flags: { power_enabled: true },
        inventory: new Set(['gate_key']),
      }),
      directorCommands: [],
    };
    const eventSystem = new EventSystem([
      {
        schemaVersion: 1,
        id: 'ev_switch_a_open_gate',
        trigger: { type: 'entity.interact', entityId: 'switch_a' },
        condition: {
          all: [
            { type: 'flag.equals', flag: 'power_enabled', value: true },
            { type: 'inventory.hasItem', itemId: 'gate_key' },
          ],
        },
        actions: [
          { type: 'switch.setState', entityId: 'switch_a', value: true },
          { type: 'door.open', entityId: 'gate_a' },
          { type: 'flag.set', flag: 'gate_a_opened', value: true },
          { type: 'timeline.play', timelineId: 'tl_open_gate' },
        ],
      },
    ]);

    const fired = new TriggerSystem(eventSystem).interact('switch_a', context);

    expect(fired).toEqual(['ev_switch_a_open_gate']);
    expect(context.state.entityStates.switch_a?.Switch).toBe(true);
    expect(context.state.doorStates.gate_a?.isOpen).toBe(true);
    expect(context.state.flags.gate_a_opened).toBe(true);
    expect(context.directorCommands).toEqual([
      { type: 'timeline.play', timelineId: 'tl_open_gate' },
    ]);
  });

  it('fires typed delivery events in order through one trigger', () => {
    const context = createDeliveryActionContext();
    const eventSystem = new EventSystem([
      {
        schemaVersion: 1,
        id: 'ev_delivery_accept',
        trigger: { type: 'entity.interact', entityId: 'courier_hill_01' },
        actions: [
          {
            type: 'delivery.accept',
            jobId: 'job.hill_mail_run',
            endpointId: 'delivery.courier_hill',
          },
        ],
      },
      {
        schemaVersion: 1,
        id: 'ev_delivery_progress',
        trigger: { type: 'entity.interact', entityId: 'courier_hill_01' },
        condition: {
          type: 'delivery.statusEquals',
          jobId: 'job.hill_mail_run',
          status: 'accepted',
        },
        actions: [{ type: 'delivery.progress', jobId: 'job.hill_mail_run' }],
      },
      {
        schemaVersion: 1,
        id: 'ev_delivery_ready',
        trigger: { type: 'entity.interact', entityId: 'courier_hill_01' },
        condition: {
          all: [
            {
              type: 'delivery.activeJobEquals',
              jobId: 'job.hill_mail_run',
            },
            {
              type: 'delivery.statusEquals',
              jobId: 'job.hill_mail_run',
              status: 'inProgress',
            },
          ],
        },
        actions: [
          {
            type: 'delivery.deliver',
            jobId: 'job.hill_mail_run',
            endpointId: 'delivery.mailbox_hill',
          },
        ],
      },
      {
        schemaVersion: 1,
        id: 'ev_delivery_complete',
        trigger: { type: 'entity.interact', entityId: 'courier_hill_01' },
        condition: {
          type: 'delivery.statusEquals',
          jobId: 'job.hill_mail_run',
          status: 'readyToDeliver',
        },
        actions: [
          {
            type: 'delivery.complete',
            jobId: 'job.hill_mail_run',
            endpointId: 'delivery.mailbox_hill',
          },
          { type: 'flag.set', flag: 'job_hill_mail_run_complete', value: true },
        ],
      },
    ]);

    const fired = new TriggerSystem(eventSystem).interact('courier_hill_01', context);

    expect(fired).toEqual([
      'ev_delivery_accept',
      'ev_delivery_progress',
      'ev_delivery_ready',
      'ev_delivery_complete',
    ]);
    expect(context.state.deliveryJobs['job.hill_mail_run']).toBe('completed');
    expect(context.state.flags.job_hill_mail_run_complete).toBe(true);
  });

  it('fires trigger enter and exit events from AABB overlap changes', () => {
    const context: ActionExecutionContext = {
      state: createEventRuntimeState(),
      directorCommands: [],
    };
    const eventSystem = new EventSystem([
      {
        schemaVersion: 1,
        id: 'ev_enter_gate_trigger',
        trigger: {
          type: 'trigger.enter',
          triggerId: 'trigger_gate_entry',
          entityId: 'player_spawn_01',
        },
        actions: [{ type: 'flag.set', flag: 'entered_gate_trigger', value: true }],
      },
      {
        schemaVersion: 1,
        id: 'ev_exit_gate_trigger',
        trigger: {
          type: 'trigger.exit',
          triggerId: 'trigger_gate_entry',
          entityId: 'player_spawn_01',
        },
        actions: [{ type: 'flag.set', flag: 'exited_gate_trigger', value: true }],
      },
    ]);
    const system = new AabbTriggerSystem(new TriggerSystem(eventSystem));
    const overlapping = [
      createColliderEntity('player_spawn_01', [0, 0, 0], [1, 1, 1]),
      createTriggerEntity('trigger_gate_entry', [0.4, 0, 0], [1, 1, 1]),
    ];
    const separated = [
      createColliderEntity('player_spawn_01', [3, 0, 0], [1, 1, 1]),
      createTriggerEntity('trigger_gate_entry', [0.4, 0, 0], [1, 1, 1]),
    ];

    expect(system.update(overlapping, context)).toMatchObject({
      entered: [{ triggerId: 'trigger_gate_entry', entityId: 'player_spawn_01' }],
      exited: [],
      firedEventIds: ['ev_enter_gate_trigger'],
    });
    expect(system.update(overlapping, context)).toMatchObject({
      entered: [],
      exited: [],
      firedEventIds: [],
    });
    expect(system.update(separated, context)).toMatchObject({
      entered: [],
      exited: [{ triggerId: 'trigger_gate_entry', entityId: 'player_spawn_01' }],
      firedEventIds: ['ev_exit_gate_trigger'],
    });
    expect(context.state.flags.entered_gate_trigger).toBe(true);
    expect(context.state.flags.exited_gate_trigger).toBe(true);
  });
});

function createColliderEntity(
  id: string,
  position: [number, number, number],
  size: [number, number, number],
) {
  return {
    id,
    transform: {
      position,
      rotation: [0, 0, 0, 1] as [number, number, number, number],
      scale: [1, 1, 1] as [number, number, number],
    },
    components: {
      Collider: {
        shape: 'aabb',
        size,
      },
    },
  };
}

function createTriggerEntity(
  id: string,
  position: [number, number, number],
  size: [number, number, number],
) {
  return {
    ...createColliderEntity(id, position, size),
    components: {
      Collider: {
        shape: 'aabb',
        size,
        isTrigger: true,
      },
      TriggerZone: {
        enabled: true,
      },
    },
  };
}

function createDeliveryActionContext(): ActionExecutionContext {
  return {
    deliveryJobs: new DeliveryJobRuntime([createDeliveryJob()], {
      endpointIds: ['delivery.courier_hill', 'delivery.mailbox_hill'],
    }),
    state: createEventRuntimeState(),
    directorCommands: [],
  };
}

function createDeliveryJob(): DeliveryJobData {
  return {
    id: 'job.hill_mail_run',
    title: 'Hill Mail Run',
    description: 'Carry the hill parcel to the mailbox.',
    acceptEndpointId: 'delivery.courier_hill',
    targetEndpointId: 'delivery.mailbox_hill',
    defaultStatus: 'available',
    package: {
      kind: 'parcel',
      label: 'Hill Parcel',
    },
    routeHints: [
      {
        type: 'endpoint',
        endpointId: 'delivery.courier_hill',
      },
      {
        type: 'endpoint',
        endpointId: 'delivery.mailbox_hill',
      },
    ],
    completion: {
      type: 'deliverToEndpoint',
      endpointId: 'delivery.mailbox_hill',
    },
    feedback: {
      accepted: 'Parcel accepted.',
      inProgress: 'Parcel underway.',
      readyToDeliver: 'Mailbox reached.',
      completed: 'Delivery complete.',
    },
  };
}
