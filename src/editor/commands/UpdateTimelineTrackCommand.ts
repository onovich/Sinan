import type { TimelineData, TimelineTrackData } from '../../schemas/timeline.schema';
import type { EditorCommand, EditorCommandContext } from './Command';

export class AddTimelineTrackCommand implements EditorCommand {
  readonly id: string;
  readonly label: string;
  private readonly after: TimelineData;

  constructor(
    private readonly before: TimelineData,
    private readonly track: TimelineTrackData,
  ) {
    this.id = `timeline-track:add:${before.id}:${track.id}:${crypto.randomUUID()}`;
    this.label = `Add ${track.id}`;
    this.after = {
      ...before,
      tracks: [...before.tracks, track],
    };
  }

  do(context: EditorCommandContext): void {
    context.updateTimeline(this.before.id, this.after);
  }

  undo(context: EditorCommandContext): void {
    context.updateTimeline(this.before.id, this.before);
  }
}

export class UpdateTimelineTrackCommand implements EditorCommand {
  readonly id: string;
  readonly label: string;
  private readonly after: TimelineData;

  constructor(
    private readonly before: TimelineData,
    private readonly track: TimelineTrackData,
  ) {
    this.id = `timeline-track:update:${before.id}:${track.id}:${crypto.randomUUID()}`;
    this.label = `Update ${track.id}`;
    this.after = {
      ...before,
      tracks: before.tracks.map((item) => (item.id === track.id ? track : item)),
    };
  }

  do(context: EditorCommandContext): void {
    context.updateTimeline(this.before.id, this.after);
  }

  undo(context: EditorCommandContext): void {
    context.updateTimeline(this.before.id, this.before);
  }
}

export class RemoveTimelineTrackCommand implements EditorCommand {
  readonly id: string;
  readonly label: string;
  private readonly after: TimelineData;

  constructor(
    private readonly before: TimelineData,
    private readonly trackId: string,
  ) {
    this.id = `timeline-track:remove:${before.id}:${trackId}:${crypto.randomUUID()}`;
    this.label = `Remove ${trackId}`;
    this.after = {
      ...before,
      tracks: before.tracks.filter((item) => item.id !== trackId),
    };
  }

  do(context: EditorCommandContext): void {
    context.updateTimeline(this.before.id, this.after);
  }

  undo(context: EditorCommandContext): void {
    context.updateTimeline(this.before.id, this.before);
  }
}
