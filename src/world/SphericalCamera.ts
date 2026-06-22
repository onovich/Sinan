import type { RuntimeCameraPose, Vec3 } from '../runtime/RuntimeTypes';
import type { WorldProjectionData } from '../schemas/worldProjection.schema';
import { projectSphericalRegion, type SphericalSurfaceFrame } from './CubeSphereProjection';

export interface FlatSurfaceCameraTarget {
  mode: 'flat';
  offset: Vec3;
  targetPosition: Vec3;
}

export interface SphericalSurfaceCameraTarget {
  headingRadians?: number;
  localPosition: Vec3;
  mode: 'spherical';
  regionId: string;
}

export type SurfaceCameraTarget = FlatSurfaceCameraTarget | SphericalSurfaceCameraTarget;

interface SurfaceCameraBaseInput {
  far?: number;
  fov: number;
  near?: number;
}

export type FlatSurfaceFollowCameraInput = SurfaceCameraBaseInput & {
  target: FlatSurfaceCameraTarget;
};

export type SphericalSurfaceFollowCameraInput = SurfaceCameraBaseInput & {
  distance: number;
  height: number;
  projection?: WorldProjectionData;
  target: SphericalSurfaceCameraTarget;
  targetHeight?: number;
};

export type SurfaceFollowCameraInput =
  | FlatSurfaceFollowCameraInput
  | SphericalSurfaceFollowCameraInput;

export type SurfaceFollowCameraFailureReason =
  | 'invalid_input'
  | 'invalid_projection'
  | 'missing_region'
  | 'missing_world_projection';

export type SurfaceFollowCameraResult =
  | {
      mode: 'flat';
      ok: true;
      pose: RuntimeCameraPose;
    }
  | {
      mode: 'spherical';
      ok: true;
      pose: RuntimeCameraPose;
      regionId: string;
      surfaceFrame: SphericalSurfaceFrame;
    }
  | {
      message: string;
      ok: false;
      reason: SurfaceFollowCameraFailureReason;
    };

const yUp: Vec3 = [0, 1, 0];
const roundScale = 1_000_000;

export function sampleSurfaceFollowCamera(
  input: SurfaceFollowCameraInput,
): SurfaceFollowCameraResult {
  const baseValidation = validateBaseCameraInput(input);

  if (baseValidation) {
    return invalidInput(baseValidation);
  }

  if (!isSphericalSurfaceFollowCameraInput(input)) {
    const targetValidation = validateVec3(input.target.targetPosition, 'targetPosition');
    const offsetValidation = validateVec3(input.target.offset, 'offset');

    if (targetValidation ?? offsetValidation) {
      return invalidInput(targetValidation ?? offsetValidation ?? 'Invalid flat camera target.');
    }

    return {
      mode: 'flat',
      ok: true,
      pose: {
        far: input.far,
        fov: input.fov,
        lookAt: roundVec3(input.target.targetPosition),
        near: input.near,
        position: roundVec3(addVec3(input.target.targetPosition, input.target.offset)),
        up: yUp,
      },
    };
  }

  if (!input.projection) {
    return {
      message: `Spherical camera target "${input.target.regionId}" requires a worldProjection.`,
      ok: false,
      reason: 'missing_world_projection',
    };
  }

  const sphericalValidation = validateSphericalCameraInput(input);

  if (sphericalValidation) {
    return invalidInput(sphericalValidation);
  }

  const region = input.projection.regions.find(
    (candidate) => candidate.id === input.target.regionId,
  );

  if (!region) {
    return {
      message: `Missing spherical camera region "${input.target.regionId}".`,
      ok: false,
      reason: 'missing_region',
    };
  }

  try {
    const surfaceFrame = projectSphericalRegion({
      localPosition: cloneVec3(input.target.localPosition),
      localYaw: input.target.headingRadians ?? 0,
      radius: input.projection.radius,
      region,
    });
    const targetHeight = input.targetHeight ?? 0;
    const lookAt = addVec3(surfaceFrame.position, scaleVec3(surfaceFrame.normal, targetHeight));
    const position = addVec3(
      addVec3(lookAt, scaleVec3(surfaceFrame.normal, input.height)),
      scaleVec3(surfaceFrame.bitangent, -input.distance),
    );

    return {
      mode: 'spherical',
      ok: true,
      pose: {
        far: input.far,
        fov: input.fov,
        lookAt: roundVec3(lookAt),
        near: input.near,
        position: roundVec3(position),
        up: surfaceFrame.normal,
      },
      regionId: region.id,
      surfaceFrame,
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : `Failed to sample spherical camera region "${input.target.regionId}".`,
      ok: false,
      reason: 'invalid_projection',
    };
  }
}

function validateBaseCameraInput(input: SurfaceCameraBaseInput): string | undefined {
  if (!Number.isFinite(input.fov) || input.fov <= 0) {
    return 'fov must be greater than zero.';
  }

  if (input.near !== undefined && (!Number.isFinite(input.near) || input.near <= 0)) {
    return 'near must be greater than zero.';
  }

  if (input.far !== undefined && (!Number.isFinite(input.far) || input.far <= 0)) {
    return 'far must be greater than zero.';
  }

  if (input.near !== undefined && input.far !== undefined && input.near >= input.far) {
    return 'near must be less than far.';
  }

  return undefined;
}

function validateSphericalCameraInput(
  input: SphericalSurfaceFollowCameraInput,
): string | undefined {
  const values = [
    ['distance', input.distance],
    ['height', input.height],
    ['targetHeight', input.targetHeight ?? 0],
    ['headingRadians', input.target.headingRadians ?? 0],
  ] as const;

  for (const [label, value] of values) {
    if (!Number.isFinite(value)) {
      return `${label} must be finite.`;
    }
  }

  if (input.distance < 0) {
    return 'distance must be nonnegative.';
  }

  if (input.height < 0) {
    return 'height must be nonnegative.';
  }

  return validateVec3(input.target.localPosition, 'localPosition');
}

function isSphericalSurfaceFollowCameraInput(
  input: SurfaceFollowCameraInput,
): input is SphericalSurfaceFollowCameraInput {
  return input.target.mode === 'spherical';
}

function validateVec3(vector: Vec3, label: string): string | undefined {
  for (let index = 0; index < vector.length; index += 1) {
    if (!Number.isFinite(vector[index])) {
      return `${label}.${index} must be finite.`;
    }
  }

  return undefined;
}

function invalidInput(message: string): SurfaceFollowCameraResult {
  return {
    message,
    ok: false,
    reason: 'invalid_input',
  };
}

function addVec3(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function scaleVec3(vector: Vec3, scale: number): Vec3 {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function cloneVec3(vector: Vec3): [number, number, number] {
  return [vector[0], vector[1], vector[2]];
}

function roundVec3(vector: Vec3): Vec3 {
  return [roundNumber(vector[0]), roundNumber(vector[1]), roundNumber(vector[2])];
}

function roundNumber(value: number): number {
  const rounded = Math.round(value * roundScale) / roundScale;

  return Object.is(rounded, -0) ? 0 : rounded;
}
