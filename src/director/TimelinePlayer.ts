import type { TimelineData, TimelineTrackData } from '../schemas/timeline.schema';

export type TimelinePlaybackStatus = 'stopped' | 'playing' | 'paused';

export interface TimelinePlayOptions {
  startTime?: number;
}

export interface TimelinePlayerState {
  timelineId: string;
  status: TimelinePlaybackStatus;
  time: number;
  cursor: number;
}

export interface TimelineTrackReachedEvent {
  timeline: TimelineData;
  track: TimelineTrackData;
  time: number;
}

export interface TimelineFinishedEvent {
  timeline: TimelineData;
  time: number;
}

export interface TimelineScrubEvent {
  timeline: TimelineData;
  time: number;
  cursor: number;
}

export interface TimelinePlayerObserver {
  onTrackReached?: (event: TimelineTrackReachedEvent) => void;
  onTimelineFinished?: (event: TimelineFinishedEvent) => void;
  onScrub?: (event: TimelineScrubEvent) => void;
}

interface MutableTimelinePlayerState extends TimelinePlayerState {
  sortedTracks: TimelineTrackData[];
}

export class TimelinePlayer {
  private readonly states = new Map<string, MutableTimelinePlayerState>();

  constructor(
    private readonly timelines: Readonly<Record<string, TimelineData>>,
    private readonly observer: TimelinePlayerObserver = {},
  ) {}

  play(timelineId: string, options: TimelinePlayOptions = {}): void {
    const timeline = this.getTimeline(timelineId);
    const sortedTracks = sortTimelineTracks(timeline.tracks);
    const time = clampTimelineTime(timeline, options.startTime ?? 0);

    this.states.set(timelineId, {
      timelineId,
      status: 'playing',
      time,
      cursor: findTrackCursor(sortedTracks, time),
      sortedTracks,
    });
  }

  pause(timelineId: string): void {
    const state = this.states.get(timelineId);

    if (state?.status === 'playing') {
      state.status = 'paused';
    }
  }

  resume(timelineId: string): void {
    const state = this.states.get(timelineId);

    if (state?.status === 'paused') {
      state.status = 'playing';
    }
  }

  stop(timelineId: string): void {
    const timeline = this.getTimeline(timelineId);
    const sortedTracks = sortTimelineTracks(timeline.tracks);

    this.states.set(timelineId, {
      timelineId,
      status: 'stopped',
      time: 0,
      cursor: 0,
      sortedTracks,
    });
  }

  seek(timelineId: string, time: number): void {
    const timeline = this.getTimeline(timelineId);
    const state = this.ensureState(timeline);
    const nextTime = clampTimelineTime(timeline, time);

    state.time = nextTime;
    state.cursor = findTrackCursor(state.sortedTracks, nextTime);
  }

  scrub(timelineId: string, time: number): void {
    const timeline = this.getTimeline(timelineId);
    const state = this.ensureState(timeline);
    const nextTime = clampTimelineTime(timeline, time);

    state.status = 'stopped';
    state.time = nextTime;
    state.cursor = findTrackCursor(state.sortedTracks, nextTime);
    this.observer.onScrub?.({ timeline, time: state.time, cursor: state.cursor });
  }

  isPlaying(timelineId: string): boolean {
    return this.states.get(timelineId)?.status === 'playing';
  }

  getState(timelineId: string): TimelinePlayerState | undefined {
    const state = this.states.get(timelineId);

    if (!state) {
      return undefined;
    }

    return {
      timelineId: state.timelineId,
      status: state.status,
      time: state.time,
      cursor: state.cursor,
    };
  }

  getStates(): TimelinePlayerState[] {
    return Array.from(this.states.values()).map((state) => ({
      timelineId: state.timelineId,
      status: state.status,
      time: state.time,
      cursor: state.cursor,
    }));
  }

  update(dt: number): void {
    if (dt <= 0) {
      return;
    }

    for (const state of this.states.values()) {
      if (state.status !== 'playing') {
        continue;
      }

      const timeline = this.getTimeline(state.timelineId);
      const previousTime = state.time;
      const nextTime = clampTimelineTime(timeline, previousTime + dt);

      this.advanceCursor(timeline, state, nextTime);
      state.time = nextTime;

      if (nextTime >= timeline.duration) {
        state.status = 'stopped';
        this.observer.onTimelineFinished?.({ timeline, time: nextTime });
      }
    }
  }

  private advanceCursor(
    timeline: TimelineData,
    state: MutableTimelinePlayerState,
    nextTime: number,
  ): void {
    while (state.cursor < state.sortedTracks.length) {
      const track = state.sortedTracks[state.cursor];
      const trackTime = getTimelineTrackStart(track);

      if (trackTime > nextTime) {
        break;
      }

      this.observer.onTrackReached?.({ timeline, track, time: trackTime });
      state.cursor += 1;
    }
  }

  private ensureState(timeline: TimelineData): MutableTimelinePlayerState {
    const existing = this.states.get(timeline.id);

    if (existing) {
      return existing;
    }

    const sortedTracks = sortTimelineTracks(timeline.tracks);
    const state: MutableTimelinePlayerState = {
      timelineId: timeline.id,
      status: 'stopped',
      time: 0,
      cursor: 0,
      sortedTracks,
    };

    this.states.set(timeline.id, state);
    return state;
  }

  private getTimeline(timelineId: string): TimelineData {
    const timeline = this.timelines[timelineId];

    if (!timeline) {
      throw new Error(`Unknown timeline "${timelineId}".`);
    }

    return timeline;
  }
}

export function sortTimelineTracks(tracks: readonly TimelineTrackData[]): TimelineTrackData[] {
  return [...tracks].sort((left, right) => {
    const timeDelta = getTimelineTrackStart(left) - getTimelineTrackStart(right);

    if (timeDelta !== 0) {
      return timeDelta;
    }

    return left.id.localeCompare(right.id);
  });
}

export function getTimelineTrackStart(track: TimelineTrackData): number {
  switch (track.type) {
    case 'action':
    case 'subtitle':
    case 'sound':
      return track.time;
    case 'animation.play':
    case 'camera.shot':
    case 'wait':
      return track.start;
    case 'property':
      return Math.min(...track.keys.map((key) => key.time));
  }
}

function findTrackCursor(sortedTracks: readonly TimelineTrackData[], time: number): number {
  const cursor = sortedTracks.findIndex((track) => getTimelineTrackStart(track) >= time);

  return cursor === -1 ? sortedTracks.length : cursor;
}

function clampTimelineTime(timeline: TimelineData, time: number): number {
  return Math.min(Math.max(time, 0), timeline.duration);
}
