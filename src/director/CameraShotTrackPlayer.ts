import type { DirectorCommand } from '../events/types';
import type { TimelineTrackData } from '../schemas/timeline.schema';

export type CameraShotTimelineTrackData = Extract<TimelineTrackData, { type: 'camera.shot' }>;

export interface CameraShotTrackContext {
  directorCommands: DirectorCommand[];
}

export class CameraShotTrackPlayer {
  play(track: CameraShotTimelineTrackData, context: CameraShotTrackContext): void {
    context.directorCommands.push({
      type: 'camera.shot.play',
      shotId: track.shotId,
      duration: track.duration,
      blendIn: track.blendIn,
      blendOut: track.blendOut,
    });
  }

  scrub(
    track: CameraShotTimelineTrackData,
    context: CameraShotTrackContext,
    timelineTime: number,
  ): void {
    context.directorCommands.push({
      type: 'camera.shot.sample',
      shotId: track.shotId,
      time: clampTrackTime(timelineTime - track.start, track.duration),
    });
  }
}

function clampTrackTime(time: number, duration: number): number {
  return roundTimelineTime(Math.min(Math.max(time, 0), duration));
}

function roundTimelineTime(time: number): number {
  return Math.round(time * 1_000_000) / 1_000_000;
}
