import type { Vec3 } from '../schemas/common.schema';
import type { WorldProjectionData } from '../schemas/worldProjection.schema';
import { projectSphericalRegion, type SphericalSurfaceFrame } from './CubeSphereProjection';

export interface SurfaceMovementState {
  headingRadians: number;
  localPosition: Vec3;
  regionId: string;
}

export interface SurfaceMovementCommand {
  deltaSeconds: number;
  forward: number;
  turn: number;
}

export interface SurfaceMovementOptions {
  moveSpeed?: number;
  turnSpeed?: number;
}

export type SurfaceMovementEdgeStatus = 'inside' | 'clamped';

export type SurfaceMovementResult =
  | {
      ok: true;
      edgeStatus: SurfaceMovementEdgeStatus;
      state: SurfaceMovementState;
      surfaceFrame: SphericalSurfaceFrame;
    }
  | {
      ok: false;
      message: string;
      reason: 'invalid_input' | 'invalid_projection' | 'missing_region';
      state: SurfaceMovementState;
    };

export interface SurfaceMovementStepInput {
  command: SurfaceMovementCommand;
  options?: SurfaceMovementOptions;
  projection: WorldProjectionData;
  state: SurfaceMovementState;
}

const defaultMoveSpeed = 1;
const defaultTurnSpeed = 1;
const roundScale = 1_000_000;

export function stepSurfaceMovement(input: SurfaceMovementStepInput): SurfaceMovementResult {
  const region = input.projection.regions.find(
    (candidate) => candidate.id === input.state.regionId,
  );

  if (!region) {
    return {
      ok: false,
      message: `Missing spherical movement region "${input.state.regionId}".`,
      reason: 'missing_region',
      state: cloneMovementState(input.state),
    };
  }

  const validationError = validateMovementInput(input);

  if (validationError) {
    return {
      ok: false,
      message: validationError,
      reason: 'invalid_input',
      state: cloneMovementState(input.state),
    };
  }

  const moveSpeed = input.options?.moveSpeed ?? defaultMoveSpeed;
  const turnSpeed = input.options?.turnSpeed ?? defaultTurnSpeed;
  const nextHeading = wrapRadians(
    input.state.headingRadians + input.command.turn * turnSpeed * input.command.deltaSeconds,
  );
  const distance = input.command.forward * moveSpeed * input.command.deltaSeconds;
  const proposedPosition: Vec3 = [
    input.state.localPosition[0] + Math.sin(nextHeading) * distance,
    input.state.localPosition[1],
    input.state.localPosition[2] + Math.cos(nextHeading) * distance,
  ];
  const clampedPosition = clampToRegionBounds(proposedPosition, region.localBounds);
  const edgeStatus = positionsEqual(proposedPosition, clampedPosition) ? 'inside' : 'clamped';
  const nextState: SurfaceMovementState = {
    headingRadians: roundNumber(nextHeading),
    localPosition: roundVec3(clampedPosition),
    regionId: input.state.regionId,
  };

  try {
    return {
      ok: true,
      edgeStatus,
      state: nextState,
      surfaceFrame: projectSphericalRegion({
        localPosition: nextState.localPosition,
        localYaw: nextState.headingRadians,
        radius: input.projection.radius,
        region,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : `Failed to project surface movement state in region "${input.state.regionId}".`,
      reason: 'invalid_projection',
      state: nextState,
    };
  }
}

function validateMovementInput(input: SurfaceMovementStepInput): string | undefined {
  const values = [
    ['deltaSeconds', input.command.deltaSeconds],
    ['forward', input.command.forward],
    ['turn', input.command.turn],
    ['headingRadians', input.state.headingRadians],
    ['moveSpeed', input.options?.moveSpeed ?? defaultMoveSpeed],
    ['turnSpeed', input.options?.turnSpeed ?? defaultTurnSpeed],
  ] as const;

  for (const [label, value] of values) {
    if (!Number.isFinite(value)) {
      return `${label} must be finite.`;
    }
  }

  if (input.command.deltaSeconds < 0) {
    return 'deltaSeconds must be nonnegative.';
  }

  if ((input.options?.moveSpeed ?? defaultMoveSpeed) < 0) {
    return 'moveSpeed must be nonnegative.';
  }

  if ((input.options?.turnSpeed ?? defaultTurnSpeed) < 0) {
    return 'turnSpeed must be nonnegative.';
  }

  for (let index = 0; index < input.state.localPosition.length; index += 1) {
    if (!Number.isFinite(input.state.localPosition[index])) {
      return `localPosition.${index} must be finite.`;
    }
  }

  return undefined;
}

function clampToRegionBounds(
  position: Vec3,
  bounds: WorldProjectionData['regions'][number]['localBounds'],
): Vec3 {
  const minX = bounds.center[0] - bounds.size[0] / 2;
  const maxX = bounds.center[0] + bounds.size[0] / 2;
  const minZ = bounds.center[2] - bounds.size[2] / 2;
  const maxZ = bounds.center[2] + bounds.size[2] / 2;

  return [clamp(position[0], minX, maxX), position[1], clamp(position[2], minZ, maxZ)];
}

function positionsEqual(left: Vec3, right: Vec3): boolean {
  return (
    roundNumber(left[0]) === roundNumber(right[0]) &&
    roundNumber(left[1]) === roundNumber(right[1]) &&
    roundNumber(left[2]) === roundNumber(right[2])
  );
}

function cloneMovementState(state: SurfaceMovementState): SurfaceMovementState {
  return {
    headingRadians: state.headingRadians,
    localPosition: [...state.localPosition],
    regionId: state.regionId,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function wrapRadians(value: number): number {
  const tau = Math.PI * 2;
  const wrapped = ((((value + Math.PI) % tau) + tau) % tau) - Math.PI;

  return Object.is(wrapped, -0) ? 0 : wrapped;
}

function roundVec3(vector: Vec3): Vec3 {
  return [roundNumber(vector[0]), roundNumber(vector[1]), roundNumber(vector[2])];
}

function roundNumber(value: number): number {
  const rounded = Math.round(value * roundScale) / roundScale;

  return Object.is(rounded, -0) ? 0 : rounded;
}
