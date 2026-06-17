import type { WebRuntime } from '../runtime/WebRuntime';
import type { TimelineTrackData } from '../schemas/timeline.schema';

export type AnimationTimelineTrackData = Extract<TimelineTrackData, { type: 'animation.play' }>;

export class AnimationTrackPlayer {
  play(track: AnimationTimelineTrackData, runtime: WebRuntime): void {
    runtime.playAnimation({
      entityId: track.entityId,
      clip: track.clip,
      loop: track.loop,
      fadeIn: track.fadeIn,
      fadeOut: track.fadeOut,
    });
  }

  scrub(track: AnimationTimelineTrackData, runtime: WebRuntime, timelineTime: number): void {
    runtime.setAnimationTime({
      entityId: track.entityId,
      clip: track.clip,
      time: roundTimelineTime(Math.max(0, timelineTime - track.start)),
    });
  }
}

function roundTimelineTime(time: number): number {
  return Math.round(time * 1_000_000) / 1_000_000;
}
