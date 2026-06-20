import type { MaterialVec2, MaterialVec3 } from './MaterialParameter';

export const SHADER_GLOBAL_KEYS = [
  'elapsedSeconds',
  'deltaSeconds',
  'viewportSize',
  'cameraPosition',
] as const;

export type ShaderGlobalKey = (typeof SHADER_GLOBAL_KEYS)[number];

export interface ShaderGlobals {
  elapsedSeconds: number;
  deltaSeconds: number;
  viewportSize: MaterialVec2;
  cameraPosition?: MaterialVec3;
}

export interface ShaderGlobalsInput {
  elapsedSeconds?: number;
  deltaSeconds?: number;
  viewportSize?: MaterialVec2;
  cameraPosition?: MaterialVec3 | null;
}

export interface ShaderGlobalsNormalizeOptions {
  maxDeltaSeconds?: number;
}

export function createDefaultShaderGlobals(): ShaderGlobals {
  return {
    elapsedSeconds: 0,
    deltaSeconds: 0,
    viewportSize: [1, 1],
  };
}

export function isShaderGlobalKey(value: string): value is ShaderGlobalKey {
  return SHADER_GLOBAL_KEYS.includes(value as ShaderGlobalKey);
}

export function isPublicShaderGlobalName(name: string): boolean {
  return isShaderGlobalKey(name);
}

export function normalizeShaderGlobals(
  input: ShaderGlobalsInput = {},
  previous: ShaderGlobals = createDefaultShaderGlobals(),
  options: ShaderGlobalsNormalizeOptions = {},
): ShaderGlobals {
  const maxDeltaSeconds = options.maxDeltaSeconds ?? 0.05;
  const cameraPosition = normalizeOptionalVec3(input.cameraPosition, previous.cameraPosition);

  return {
    elapsedSeconds: normalizeNonNegativeNumber(input.elapsedSeconds, previous.elapsedSeconds),
    deltaSeconds: Math.min(
      normalizeNonNegativeNumber(input.deltaSeconds, previous.deltaSeconds),
      normalizePositiveNumber(maxDeltaSeconds, 0.05),
    ),
    viewportSize: normalizeViewportSize(input.viewportSize, previous.viewportSize),
    ...(cameraPosition ? { cameraPosition } : {}),
  };
}

function normalizeNonNegativeNumber(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return Math.max(0, fallback);
  }

  return Math.max(0, value);
}

function normalizePositiveNumber(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeViewportSize(
  value: MaterialVec2 | undefined,
  fallback: MaterialVec2,
): MaterialVec2 {
  if (!isFiniteTuple(value, 2)) {
    return [Math.max(1, fallback[0]), Math.max(1, fallback[1])];
  }

  return [Math.max(1, value[0]), Math.max(1, value[1])];
}

function normalizeOptionalVec3(
  value: MaterialVec3 | null | undefined,
  fallback: MaterialVec3 | undefined,
): MaterialVec3 | undefined {
  if (value === null) {
    return undefined;
  }

  if (isFiniteTuple(value, 3)) {
    return [value[0], value[1], value[2]];
  }

  return fallback ? [fallback[0], fallback[1], fallback[2]] : undefined;
}

function isFiniteTuple(value: readonly number[] | undefined, length: 2): value is MaterialVec2;
function isFiniteTuple(value: readonly number[] | undefined, length: 3): value is MaterialVec3;
function isFiniteTuple(value: readonly number[] | undefined, length: number): boolean {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  );
}
