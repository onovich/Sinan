import { describe, expect, it } from 'vitest';

import type { TransformData } from '../../schemas/transform.schema';
import { CommandHistory } from './CommandHistory';
import { TransformEntityCommand } from './TransformEntityCommand';

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
    };

    history.execute(new TransformEntityCommand('switch_a', before, after), context);
    history.undo(context);
    history.redo(context);

    expect(applied).toEqual([after, before, after]);
  });
});
