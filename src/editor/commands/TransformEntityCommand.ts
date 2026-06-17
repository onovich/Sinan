import type { TransformData } from '../../schemas/transform.schema';
import type { EditorCommand, EditorCommandContext } from './Command';

export class TransformEntityCommand implements EditorCommand {
  readonly id: string;
  readonly label: string;

  constructor(
    private readonly entityId: string,
    private readonly before: TransformData,
    private readonly after: TransformData,
  ) {
    this.id = `transform:${entityId}:${crypto.randomUUID()}`;
    this.label = `Transform ${entityId}`;
  }

  do(context: EditorCommandContext): void {
    context.updateEntityTransform(this.entityId, this.after);
  }

  undo(context: EditorCommandContext): void {
    context.updateEntityTransform(this.entityId, this.before);
  }
}
