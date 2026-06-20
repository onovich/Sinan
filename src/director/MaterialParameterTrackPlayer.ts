import type { MaterialParameterValue } from '../runtime/materials';
import type { TimelineTrackData } from '../schemas/timeline.schema';

export type MaterialParameterTimelineTrackData = Extract<
  TimelineTrackData,
  { type: 'material.parameter' }
>;

export interface MaterialParameterTrackSample {
  target: string;
  slot: string;
  parameter: string;
  value: MaterialParameterValue;
}

export class MaterialParameterTrackPlayer {
  sample(
    track: MaterialParameterTimelineTrackData,
    timelineTime: number,
  ): MaterialParameterTrackSample {
    const keys = sortKeys(track.keys);
    const value = sampleMaterialParameterValue(keys, timelineTime);

    return {
      target: track.target,
      slot: track.slot,
      parameter: track.parameter,
      value,
    };
  }
}

function sampleMaterialParameterValue(
  keys: MaterialParameterTimelineTrackData['keys'],
  timelineTime: number,
): MaterialParameterValue {
  if (timelineTime <= keys[0].time) {
    return keys[0].value;
  }

  let previous = keys[0];
  let next = keys.find((key) => {
    if (key.time <= timelineTime) {
      previous = key;
      return false;
    }

    return true;
  });

  if (!next) {
    return previous.value;
  }

  if (previous.time === timelineTime) {
    return previous.value;
  }

  const span = next.time - previous.time;
  const alpha = span <= 0 ? 1 : (timelineTime - previous.time) / span;

  return interpolateMaterialParameterValue(previous.value, next.value, alpha);
}

function interpolateMaterialParameterValue(
  previous: MaterialParameterValue,
  next: MaterialParameterValue,
  alpha: number,
): MaterialParameterValue {
  if (typeof previous === 'number' && typeof next === 'number') {
    return roundTimelineValue(previous + (next - previous) * alpha);
  }

  if (isHexColor(previous) && isHexColor(next)) {
    return interpolateHexColor(previous, next, alpha);
  }

  if (isNumberTuple(previous, 2) && isNumberTuple(next, 2)) {
    return [
      roundTimelineValue(previous[0] + (next[0] - previous[0]) * alpha),
      roundTimelineValue(previous[1] + (next[1] - previous[1]) * alpha),
    ];
  }

  if (isNumberTuple(previous, 3) && isNumberTuple(next, 3)) {
    return [
      roundTimelineValue(previous[0] + (next[0] - previous[0]) * alpha),
      roundTimelineValue(previous[1] + (next[1] - previous[1]) * alpha),
      roundTimelineValue(previous[2] + (next[2] - previous[2]) * alpha),
    ];
  }

  return previous;
}

function sortKeys(
  keys: MaterialParameterTimelineTrackData['keys'],
): MaterialParameterTimelineTrackData['keys'] {
  return keys
    .map((key, index) => ({ key, index }))
    .sort((left, right) => left.key.time - right.key.time || left.index - right.index)
    .map(({ key }) => key);
}

function interpolateHexColor(previous: string, next: string, alpha: number): string {
  const previousRgb = hexToRgb(previous);
  const nextRgb = hexToRgb(next);

  return rgbToHex([
    Math.round(previousRgb[0] + (nextRgb[0] - previousRgb[0]) * alpha),
    Math.round(previousRgb[1] + (nextRgb[1] - previousRgb[1]) * alpha),
    Math.round(previousRgb[2] + (nextRgb[2] - previousRgb[2]) * alpha),
  ]);
}

function hexToRgb(value: string): readonly [number, number, number] {
  const hex = value.slice(1, 7);

  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function rgbToHex(value: readonly [number, number, number]): string {
  return `#${value.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function isHexColor(value: MaterialParameterValue): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value);
}

function isNumberTuple(
  value: MaterialParameterValue,
  length: 2,
): value is readonly [number, number];
function isNumberTuple(
  value: MaterialParameterValue,
  length: 3,
): value is readonly [number, number, number];
function isNumberTuple(value: MaterialParameterValue, length: 2 | 3): boolean {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  );
}

function roundTimelineValue(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
