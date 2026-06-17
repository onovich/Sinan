import type { TimelineTrackData } from '../schemas/timeline.schema';

export type PropertyTimelineTrackData = Extract<TimelineTrackData, { type: 'property' }>;
export type PropertyTrackValue = PropertyTimelineTrackData['keys'][number]['value'];

export interface PropertyTrackSample {
  target: string;
  property: string;
  value: PropertyTrackValue;
}

export class PropertyTrackPlayer {
  sample(track: PropertyTimelineTrackData, timelineTime: number): PropertyTrackSample {
    const keys = [...track.keys].sort((left, right) => left.time - right.time);
    const value = samplePropertyValue(keys, timelineTime);

    return {
      target: track.target,
      property: track.property,
      value,
    };
  }
}

function samplePropertyValue(
  keys: PropertyTimelineTrackData['keys'],
  timelineTime: number,
): PropertyTrackValue {
  if (timelineTime <= keys[0].time) {
    return keys[0].value;
  }

  for (let index = 1; index < keys.length; index += 1) {
    const previous = keys[index - 1];
    const next = keys[index];

    if (timelineTime <= next.time) {
      const span = next.time - previous.time;
      const alpha = span <= 0 ? 1 : (timelineTime - previous.time) / span;

      return interpolatePropertyValue(previous.value, next.value, alpha);
    }
  }

  return keys[keys.length - 1].value;
}

function interpolatePropertyValue(
  previous: PropertyTrackValue,
  next: PropertyTrackValue,
  alpha: number,
): PropertyTrackValue {
  if (typeof previous === 'number' && typeof next === 'number') {
    return roundTimelineValue(previous + (next - previous) * alpha);
  }

  if (isVec3(previous) && isVec3(next)) {
    return [
      roundTimelineValue(previous[0] + (next[0] - previous[0]) * alpha),
      roundTimelineValue(previous[1] + (next[1] - previous[1]) * alpha),
      roundTimelineValue(previous[2] + (next[2] - previous[2]) * alpha),
    ];
  }

  return alpha >= 1 ? next : previous;
}

function isVec3(value: PropertyTrackValue): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3;
}

function roundTimelineValue(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
