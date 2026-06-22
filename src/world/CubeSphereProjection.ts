import type { Quat, Vec3 } from '../schemas/common.schema';
import type {
  SphericalRegionData,
  SphericalRegionLocalBoundsData,
  WorldProjectionFaceData,
} from '../schemas/worldProjection.schema';

export interface SphericalSurfaceFrame {
  position: Vec3;
  normal: Vec3;
  tangent: Vec3;
  bitangent: Vec3;
  rotation: Quat;
}

export interface CubeSphereProjectionInput {
  face: WorldProjectionFaceData;
  localBounds: SphericalRegionLocalBoundsData;
  localPosition: Vec3;
  localYaw?: number;
  radius: number;
}

export interface SphericalRegionProjectionInput {
  localPosition?: Vec3;
  localYaw?: number;
  radius: number;
  region: SphericalRegionData;
}

interface FaceBasis {
  cubeVector: Vec3;
  rawTangent: Vec3;
}

const roundScale = 1_000_000;

export function projectSphericalRegion(
  input: SphericalRegionProjectionInput,
): SphericalSurfaceFrame {
  return projectCubeSphereLocal({
    face: input.region.face,
    localBounds: input.region.localBounds,
    localPosition: input.localPosition ?? input.region.localBounds.center,
    localYaw: input.localYaw,
    radius: input.radius,
  });
}

export function projectCubeSphereLocal(input: CubeSphereProjectionInput): SphericalSurfaceFrame {
  assertPositiveFinite(input.radius, 'radius');
  assertFiniteVec3(input.localPosition, 'localPosition');
  assertFiniteVec3(input.localBounds.center, 'localBounds.center');
  assertPositiveFiniteVec3(input.localBounds.size, 'localBounds.size');

  const u = normalizeBoundsCoordinate(
    input.localPosition[0],
    input.localBounds.center[0],
    input.localBounds.size[0],
  );
  const v = normalizeBoundsCoordinate(
    input.localPosition[2],
    input.localBounds.center[2],
    input.localBounds.size[2],
  );
  const height = input.localPosition[1] - input.localBounds.center[1];
  const surfaceRadius = input.radius + height;

  assertPositiveFinite(surfaceRadius, 'surface radius');

  const basis = mapFaceToCube(input.face, u, v);
  const normal = normalizeVec3(basis.cubeVector);
  const tangent = applyYawToTangent(
    normalizeVec3(rejectFromNormal(basis.rawTangent, normal)),
    normal,
    input.localYaw ?? 0,
  );
  const bitangent = normalizeVec3(cross(normal, tangent));
  const position = scaleVec3(normal, surfaceRadius);
  const rotation = quatFromSurfaceBasis(tangent, normal, bitangent);

  return {
    bitangent: roundVec3(bitangent),
    normal: roundVec3(normal),
    position: roundVec3(position),
    rotation: roundQuat(rotation),
    tangent: roundVec3(tangent),
  };
}

function mapFaceToCube(face: WorldProjectionFaceData, u: number, v: number): FaceBasis {
  switch (face) {
    case 'front':
      return { cubeVector: [u, v, 1], rawTangent: [1, 0, 0] };
    case 'back':
      return { cubeVector: [-u, v, -1], rawTangent: [-1, 0, 0] };
    case 'right':
      return { cubeVector: [1, v, -u], rawTangent: [0, 0, -1] };
    case 'left':
      return { cubeVector: [-1, v, u], rawTangent: [0, 0, 1] };
    case 'top':
      return { cubeVector: [u, 1, -v], rawTangent: [1, 0, 0] };
    case 'bottom':
      return { cubeVector: [u, -1, v], rawTangent: [1, 0, 0] };
    default:
      throw new Error(`Unsupported cube-sphere face "${String(face)}".`);
  }
}

function normalizeBoundsCoordinate(value: number, center: number, size: number): number {
  return (value - center) / (size / 2);
}

function applyYawToTangent(tangent: Vec3, normal: Vec3, yaw: number): Vec3 {
  assertFiniteNumber(yaw, 'localYaw');

  if (yaw === 0) {
    return tangent;
  }

  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const yawBitangent = cross(normal, tangent);

  return normalizeVec3([
    tangent[0] * cos + yawBitangent[0] * sin,
    tangent[1] * cos + yawBitangent[1] * sin,
    tangent[2] * cos + yawBitangent[2] * sin,
  ]);
}

function rejectFromNormal(vector: Vec3, normal: Vec3): Vec3 {
  const dotValue = dot(vector, normal);

  return [
    vector[0] - normal[0] * dotValue,
    vector[1] - normal[1] * dotValue,
    vector[2] - normal[2] * dotValue,
  ];
}

function quatFromSurfaceBasis(tangent: Vec3, normal: Vec3, bitangent: Vec3): Quat {
  const negativeBitangent = scaleVec3(bitangent, -1);

  return normalizeQuat(
    quatFromMatrixColumns({
      xAxis: tangent,
      yAxis: normal,
      zAxis: negativeBitangent,
    }),
  );
}

function quatFromMatrixColumns(input: { xAxis: Vec3; yAxis: Vec3; zAxis: Vec3 }): Quat {
  const m00 = input.xAxis[0];
  const m01 = input.yAxis[0];
  const m02 = input.zAxis[0];
  const m10 = input.xAxis[1];
  const m11 = input.yAxis[1];
  const m12 = input.zAxis[1];
  const m20 = input.xAxis[2];
  const m21 = input.yAxis[2];
  const m22 = input.zAxis[2];
  const trace = m00 + m11 + m22;

  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;

    return [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s];
  }

  if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;

    return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  }

  if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;

    return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  }

  const s = Math.sqrt(1 + m22 - m00 - m11) * 2;

  return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
}

function normalizeVec3(vector: Vec3): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]);

  if (!Number.isFinite(length) || length === 0) {
    throw new Error('Cannot normalize a zero or non-finite vector.');
  }

  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function normalizeQuat(quat: Quat): Quat {
  const length = Math.hypot(quat[0], quat[1], quat[2], quat[3]);

  if (!Number.isFinite(length) || length === 0) {
    return [0, 0, 0, 1];
  }

  return [quat[0] / length, quat[1] / length, quat[2] / length, quat[3] / length];
}

function scaleVec3(vector: Vec3, scale: number): Vec3 {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function cross(left: Vec3, right: Vec3): Vec3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function dot(left: Vec3, right: Vec3): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function assertPositiveFiniteVec3(vector: Vec3, label: string): void {
  vector.forEach((value, index) => assertPositiveFinite(value, `${label}.${index}`));
}

function assertFiniteVec3(vector: Vec3, label: string): void {
  vector.forEach((value, index) => assertFiniteNumber(value, `${label}.${index}`));
}

function assertPositiveFinite(value: number, label: string): void {
  assertFiniteNumber(value, label);

  if (value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`);
  }
}

function roundVec3(vector: Vec3): Vec3 {
  return [roundNumber(vector[0]), roundNumber(vector[1]), roundNumber(vector[2])];
}

function roundQuat(quat: Quat): Quat {
  return [roundNumber(quat[0]), roundNumber(quat[1]), roundNumber(quat[2]), roundNumber(quat[3])];
}

function roundNumber(value: number): number {
  const rounded = Math.round(value * roundScale) / roundScale;

  return Object.is(rounded, -0) ? 0 : rounded;
}
