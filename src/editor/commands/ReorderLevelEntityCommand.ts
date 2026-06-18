import type { LevelData } from '../../schemas/level.schema';
import type { EditorCommand, EditorCommandContext } from './Command';

export class ReorderLevelEntityCommand implements EditorCommand {
  readonly id: string;
  readonly label: string;

  constructor(
    private readonly entityId: string,
    private readonly before: LevelData,
    private readonly after: LevelData,
  ) {
    this.id = `level:reorder:${entityId}:${crypto.randomUUID()}`;
    this.label = `Reorder ${entityId}`;
  }

  do(context: EditorCommandContext): void {
    context.updateLevel(this.after);
  }

  undo(context: EditorCommandContext): void {
    context.updateLevel(this.before);
  }
}
