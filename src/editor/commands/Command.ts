import type { EventData } from '../../schemas/event.schema';
import type { TransformData } from '../../schemas/transform.schema';

export interface EditorCommandContext {
  updateEntityTransform(entityId: string, transform: TransformData): void;
  updateEvent(eventId: string, event: EventData): void;
}

export interface EditorCommand {
  id: string;
  label: string;
  do(context: EditorCommandContext): void;
  undo(context: EditorCommandContext): void;
}
