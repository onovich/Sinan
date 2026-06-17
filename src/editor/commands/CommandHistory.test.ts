import { describe, expect, it } from 'vitest';

import type { EventData } from '../../schemas/event.schema';
import type { TransformData } from '../../schemas/transform.schema';
import { CommandHistory } from './CommandHistory';
import { TransformEntityCommand } from './TransformEntityCommand';
import { UpdateEventCommand } from './UpdateEventCommand';

const before: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

const after: TransformData = {
  position: [2, 1, 4],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

describe('CommandHistory', () => {
  it('executes, undoes, and redoes transform commands', () => {
    const applied: TransformData[] = [];
    const history = new CommandHistory();
    const context = {
      updateEntityTransform: (_entityId: string, transform: TransformData) => {
        applied.push(transform);
      },
      updateEvent: () => undefined,
    };

    history.execute(new TransformEntityCommand('switch_a', before, after), context);
    history.undo(context);
    history.redo(context);

    expect(applied).toEqual([after, before, after]);
  });

  it('executes, undoes, and redoes event update commands', () => {
    const applied: EventData[] = [];
    const history = new CommandHistory();
    const eventBefore = createEvent('Switch opens gate');
    const eventAfter = createEvent('Switch opens gate safely');
    const context = {
      updateEntityTransform: () => undefined,
      updateEvent: (_eventId: string, event: EventData) => {
        applied.push(event);
      },
    };

    history.execute(
      new UpdateEventCommand('ev_switch_a_open_gate', eventBefore, eventAfter),
      context,
    );
    history.undo(context);
    history.redo(context);

    expect(applied).toEqual([eventAfter, eventBefore, eventAfter]);
  });
});

function createEvent(name: string): EventData {
  return {
    schemaVersion: 1,
    id: 'ev_switch_a_open_gate',
    name,
    trigger: {
      type: 'entity.interact',
      entityId: 'switch_a',
    },
    actions: [
      {
        type: 'door.open',
        entityId: 'gate_a',
      },
    ],
  };
}
