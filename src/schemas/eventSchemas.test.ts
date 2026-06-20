import { describe, expect, it } from 'vitest';

import { ActionSchema } from './action.schema';
import { ConditionSchema } from './condition.schema';
import { EventSchema } from './event.schema';
import { TriggerSchema } from './trigger.schema';

describe('event condition action schemas', () => {
  it('parses a switch interaction event', () => {
    const result = EventSchema.safeParse({
      schemaVersion: 1,
      id: 'ev_switch_a_open_gate',
      trigger: {
        type: 'entity.interact',
        entityId: 'switch_a',
      },
      condition: {
        all: [
          {
            type: 'flag.equals',
            flag: 'power_enabled',
            value: true,
          },
          {
            any: [
              {
                type: 'inventory.hasItem',
                itemId: 'gate_key',
              },
              {
                type: 'quest.stateEquals',
                questId: 'main_quest',
                state: 'gate_unlocked',
              },
            ],
          },
        ],
      },
      actions: [
        {
          type: 'switch.setState',
          entityId: 'switch_a',
          value: true,
        },
        {
          type: 'timeline.play',
          timelineId: 'tl_open_gate',
        },
        {
          type: 'material.setParameter',
          entityId: 'gate_a',
          slot: 'main',
          parameter: 'progress',
          value: 0,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('parses recursive not conditions', () => {
    expect(
      ConditionSchema.safeParse({
        not: {
          type: 'flag.exists',
          flag: 'gate_a_opened',
        },
      }).success,
    ).toBe(true);
  });

  it('parses MVP triggers', () => {
    expect(TriggerSchema.safeParse({ type: 'level.start' }).success).toBe(true);
    expect(
      TriggerSchema.safeParse({ type: 'timeline.finished', timelineId: 'tl_open_gate' }).success,
    ).toBe(true);
  });

  it('rejects raw script fields on actions', () => {
    expect(
      ActionSchema.safeParse({
        type: 'function.call',
        name: 'quest.advance',
        script: 'window.openGate()',
      }).success,
    ).toBe(false);
  });

  it('rejects raw uniform-like material action parameters', () => {
    expect(
      ActionSchema.safeParse({
        type: 'material.setParameter',
        entityId: 'gate_a',
        slot: 'main',
        parameter: 'uProgress',
        value: 0.5,
      }).success,
    ).toBe(false);
  });

  it('rejects event objects with arbitrary handlers', () => {
    expect(
      EventSchema.safeParse({
        schemaVersion: 1,
        id: 'ev_bad',
        trigger: { type: 'level.start' },
        onInteract: 'openGateAndPlayCamera()',
        actions: [{ type: 'flag.toggle', flag: 'bad' }],
      }).success,
    ).toBe(false);
  });
});
