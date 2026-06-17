import type { DirectorCommand } from '../events/types';
import type { TimelineTrackData } from '../schemas/timeline.schema';

export type SoundTimelineTrackData = Extract<TimelineTrackData, { type: 'sound' }>;

export interface AudioTrackContext {
  directorCommands: DirectorCommand[];
}

export class AudioTrackPlayer {
  play(track: SoundTimelineTrackData, context: AudioTrackContext): void {
    context.directorCommands.push({
      type: 'sound.play',
      soundId: track.soundId,
    });
  }

  scrub(): boolean {
    return false;
  }
}
