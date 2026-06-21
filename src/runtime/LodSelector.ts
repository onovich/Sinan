import type {
  RuntimeLodGroup,
  RuntimeLodLevel,
  RuntimeLodSelectionInput,
  RuntimeLodSelectionResult,
} from './RuntimeTypes';

export function selectRuntimeLodLevel(input: RuntimeLodSelectionInput): RuntimeLodSelectionResult {
  const group = input.group;

  if (!group || group.enabled === false || group.levels.length === 0) {
    return { status: 'disabled', changed: false, fallbackUsed: false };
  }

  const levels = [...group.levels].sort((left, right) => left.level - right.level);
  const distance = normalizeDistance(input.distance);
  const candidate = selectDistanceLevel(levels, distance);
  const current = getCurrentLevel(levels, input.currentLevel);
  const stabilized = applyHysteresis(candidate, current, distance, group.hysteresis);
  const biased = applyLowEndBias(levels, stabilized, group, input.qualityProfile === 'low-end');
  const fallback = applyFallbackLevel(biased, group, levels, input.availableAssetIds);

  return {
    status: 'selected',
    level: fallback.level.level,
    asset: fallback.level.asset,
    distance,
    changed: input.currentLevel !== fallback.level.level,
    fallbackUsed: fallback.fallbackUsed,
  };
}

function normalizeDistance(distance: number): number {
  return Number.isFinite(distance) ? Math.max(0, distance) : 0;
}

function selectDistanceLevel(
  levels: readonly RuntimeLodLevel[],
  distance: number,
): RuntimeLodLevel {
  let selected = levels[0];

  for (const level of levels) {
    if (distance < level.minDistance) {
      break;
    }

    selected = level;
  }

  return selected;
}

function getCurrentLevel(
  levels: readonly RuntimeLodLevel[],
  currentLevel: number | undefined,
): RuntimeLodLevel | undefined {
  if (currentLevel === undefined) {
    return undefined;
  }

  return levels.find((level) => level.level === currentLevel);
}

function applyHysteresis(
  candidate: RuntimeLodLevel,
  current: RuntimeLodLevel | undefined,
  distance: number,
  hysteresis: number,
): RuntimeLodLevel {
  if (!current || candidate.level === current.level) {
    return candidate;
  }

  if (candidate.level > current.level) {
    return distance >= candidate.minDistance + hysteresis ? candidate : current;
  }

  return distance < current.minDistance - hysteresis ? candidate : current;
}

function applyLowEndBias(
  levels: readonly RuntimeLodLevel[],
  selected: RuntimeLodLevel,
  group: RuntimeLodGroup,
  enabled: boolean,
): RuntimeLodLevel {
  if (!enabled || group.lowEndBias === 0) {
    return selected;
  }

  const selectedIndex = Math.max(
    0,
    levels.findIndex((level) => level.level === selected.level),
  );
  const biasedIndex = Math.min(levels.length - 1, selectedIndex + group.lowEndBias);

  return levels[biasedIndex] ?? selected;
}

function applyFallbackLevel(
  selected: RuntimeLodLevel,
  group: RuntimeLodGroup,
  levels: readonly RuntimeLodLevel[],
  availableAssetIds: ReadonlySet<string> | undefined,
): { level: RuntimeLodLevel; fallbackUsed: boolean } {
  if (!availableAssetIds || availableAssetIds.has(selected.asset)) {
    return { level: selected, fallbackUsed: false };
  }

  return {
    level:
      levels.find((level) => level.asset === group.fallbackAsset) ??
      levels[levels.length - 1] ??
      selected,
    fallbackUsed: true,
  };
}
