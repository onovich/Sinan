import { ActionSystem } from '../events/ActionSystem';
import type { ActionExecutionContext } from '../events/types';
import type { TimelineTrackData } from '../schemas/timeline.schema';

export type ActionTimelineTrackData = Extract<TimelineTrackData, { type: 'action' }>;

export class ActionTrackPlayer {
  constructor(private readonly actionSystem = new ActionSystem()) {}

  play(track: ActionTimelineTrackData, context: ActionExecutionContext): void {
    this.actionSystem.dispatch(track.action, context);
  }

  scrub(track: ActionTimelineTrackData, context: ActionExecutionContext): boolean {
    const sideEffect = this.actionSystem.getSideEffect(track.action);

    if (sideEffect === 'runtimeOnly' || sideEffect === 'destructive') {
      return false;
    }

    this.actionSystem.dispatch(track.action, context);
    return true;
  }
}
