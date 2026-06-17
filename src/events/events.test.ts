import { describe, expect, it } from 'vitest';

import { ActionSystem } from './ActionSystem';
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
});

describe('ActionSystem', () => {
  it('dispatches flag, visibility, door, and timeline actions', () => {
    const visibleCalls: Array<[string, boolean]> = [];
    const context: ActionExecutionContext = {
      state: createEventRuntimeState(),
      runtime: {
        setVisible: (entityId, visible) => {
          visibleCalls.push([entityId, visible]);
        },
      },
      directorCommands: [],
    };

    new ActionSystem().dispatchAll(
      [
        { type: 'flag.set', flag: 'power_enabled', value: true },
        { type: 'flag.toggle', flag: 'gate_a_opened' },
        { type: 'entity.setVisible', entityId: 'gate_a', visible: false },
        { type: 'door.open', entityId: 'gate_a' },
        { type: 'timeline.play', timelineId: 'tl_open_gate' },
      ],
      context,
    );

    expect(context.state.flags.power_enabled).toBe(true);
    expect(context.state.flags.gate_a_opened).toBe(true);
    expect(context.state.entityVisibility.gate_a).toBe(false);
    expect(context.state.doorStates.gate_a?.isOpen).toBe(true);
    expect(visibleCalls).toEqual([['gate_a', false]]);
    expect(context.directorCommands).toEqual([
      { type: 'timeline.play', timelineId: 'tl_open_gate' },
    ]);
  });
});

describe('registries', () => {
  it('registers MVP condition, action, and trigger types', () => {
    const conditionRegistry = createDefaultConditionRegistry();
    const actionRegistry = createDefaultActionRegistry();
    const triggerRegistry = createDefaultTriggerRegistry();

    expect(conditionRegistry.has('flag.equals')).toBe(true);
    expect(conditionRegistry.has('inventory.hasItem')).toBe(true);
    expect(actionRegistry.has('flag.set')).toBe(true);
    expect(actionRegistry.has('timeline.play')).toBe(true);
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
});
