import type {
  Quat,
  RuntimeScatterGroup,
  RuntimeScatterInstance,
  RuntimeScatterRange,
  RuntimeStyleQualityProfile,
  Vec3,
} from './RuntimeTypes';

export interface ScatterGenerationOptions {
  qualityProfile?: RuntimeStyleQualityProfile;
}

export function generateScatterInstances(
  group: RuntimeScatterGroup,
  options: ScatterGenerationOptions = {},
): RuntimeScatterInstance[] {
  const count = resolveScatterCount(group, options.qualityProfile);
  const random = createSeededRandom(`${group.id}:${String(group.seed)}`);
  const instances: RuntimeScatterInstance[] = [];

  for (let index = 0; index < count; index += 1) {
    const position = sampleBoxPosition(group.placement.center, group.placement.size, random);
    const yaw = sampleRange(group.transform?.yaw, random, 0);
    const scale = sampleRange(group.transform?.uniformScale, random, 1);

    instances.push({
      id: `${group.id}:${index}`,
      groupId: group.id,
      source: group.source,
      transform: {
        position,
        rotation: yawRotation(yaw),
        scale: [scale, scale, scale],
      },
    });
  }

  return instances;
}

function resolveScatterCount(
  group: RuntimeScatterGroup,
  qualityProfile: RuntimeStyleQualityProfile | undefined,
): number {
  if (qualityProfile !== 'low-end') {
    return group.count;
  }

  const scale = group.quality?.lowEndCountScale ?? 1;

  return Math.max(0, Math.floor(group.count * scale));
}

function sampleBoxPosition(
  center: Vec3,
  size: Vec3,
  random: () => number,
): [number, number, number] {
  return [
    sampleAxis(center[0], size[0], random),
    sampleAxis(center[1], size[1], random),
    sampleAxis(center[2], size[2], random),
  ];
}

function sampleAxis(center: number, size: number, random: () => number): number {
  return center - size / 2 + random() * size;
}

function sampleRange(
  range: RuntimeScatterRange | undefined,
  random: () => number,
  fallback: number,
): number {
  if (!range) {
    return fallback;
  }

  return range.min + random() * (range.max - range.min);
}

function yawRotation(yaw: number): Quat {
  return [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
}

function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed);

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}
