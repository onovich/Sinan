import type { TimelineData } from '../../schemas/timeline.schema';
import type { EditorCommand, EditorCommandContext } from './Command';

export type TimelineItemOperation = 'add' | 'update' | 'remove';

export class AddTimelineItemCommand implements EditorCommand {
  readonly id: string;
  readonly label: string;

  constructor(
    private readonly before: TimelineData,
    private readonly after: TimelineData,
    itemLabel: string,
  ) {
    this.id = `timeline-item:add:${before.id}:${crypto.randomUUID()}`;
    this.label = `Add ${itemLabel}`;
  }

  do(context: EditorCommandContext): void {
    context.updateTimeline(this.before.id, this.after);
  }

  undo(context: EditorCommandContext): void {
    context.updateTimeline(this.before.id, this.before);
  }
}

export class UpdateTimelineItemCommand implements EditorCommand {
  readonly id: string;
  readonly label: string;

  constructor(
    private readonly before: TimelineData,
    private readonly after: TimelineData,
    itemLabel: string,
  ) {
    this.id = `timeline-item:update:${before.id}:${crypto.randomUUID()}`;
    this.label = `Update ${itemLabel}`;
  }

  do(context: EditorCommandContext): void {
    context.updateTimeline(this.before.id, this.after);
  }

  undo(context: EditorCommandContext): void {
    context.updateTimeline(this.before.id, this.before);
  }
}

export class RemoveTimelineItemCommand implements EditorCommand {
  readonly id: string;
  readonly label: string;

  constructor(
    private readonly before: TimelineData,
    private readonly after: TimelineData,
    itemLabel: string,
  ) {
    this.id = `timeline-item:remove:${before.id}:${crypto.randomUUID()}`;
    this.label = `Remove ${itemLabel}`;
  }

  do(context: EditorCommandContext): void {
    context.updateTimeline(this.before.id, this.after);
  }

  undo(context: EditorCommandContext): void {
    context.updateTimeline(this.before.id, this.before);
  }
}
