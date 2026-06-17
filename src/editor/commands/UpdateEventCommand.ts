import type { EventData } from '../../schemas/event.schema';
import type { EditorCommand, EditorCommandContext } from './Command';

export class UpdateEventCommand implements EditorCommand {
  readonly id: string;
  readonly label: string;

  constructor(
    private readonly eventId: string,
    private readonly before: EventData,
    private readonly after: EventData,
  ) {
    this.id = `event:${eventId}:${crypto.randomUUID()}`;
    this.label = `Update ${eventId}`;
  }

  do(context: EditorCommandContext): void {
    context.updateEvent(this.eventId, this.after);
  }

  undo(context: EditorCommandContext): void {
    context.updateEvent(this.eventId, this.before);
  }
}
