import type { DirectorCommand } from '../events/types';
import type { TimelineTrackData } from '../schemas/timeline.schema';

export type SubtitleTimelineTrackData = Extract<TimelineTrackData, { type: 'subtitle' }>;

export interface SubtitleTrackContext {
  directorCommands: DirectorCommand[];
}

export class SubtitleTrackPlayer {
  play(track: SubtitleTimelineTrackData, context: SubtitleTrackContext): void {
    context.directorCommands.push(createSubtitleCommand(track));
  }

  scrub(
    track: SubtitleTimelineTrackData,
    context: SubtitleTrackContext,
    timelineTime: number,
  ): boolean {
    if (timelineTime < track.time || timelineTime > track.time + track.duration) {
      return false;
    }

    context.directorCommands.push(createSubtitleCommand(track));
    return true;
  }
}

function createSubtitleCommand(track: SubtitleTimelineTrackData): DirectorCommand {
  const command: DirectorCommand = {
    type: 'subtitle.show',
    text: track.text,
    duration: track.duration,
  };

  if (track.speaker) {
    command.speaker = track.speaker;
  }

  return command;
}
