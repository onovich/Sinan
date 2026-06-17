import type { ComponentMapData } from '../../schemas/entity.schema';
import type { EditorCommand, EditorCommandContext } from './Command';

export class UpdateEntityComponentCommand implements EditorCommand {
  readonly id: string;
  readonly label: string;

  constructor(
    private readonly entityId: string,
    private readonly before: ComponentMapData,
    private readonly after: ComponentMapData,
    componentType: string,
  ) {
    this.id = `component:${entityId}:${componentType}:${crypto.randomUUID()}`;
    this.label = `Update ${entityId} ${componentType}`;
  }

  do(context: EditorCommandContext): void {
    context.updateEntityComponents(this.entityId, this.after);
  }

  undo(context: EditorCommandContext): void {
    context.updateEntityComponents(this.entityId, this.before);
  }
}
