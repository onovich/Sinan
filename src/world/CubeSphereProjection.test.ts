import { describe, expect, it } from 'vitest';

import type { Vec3 } from '../schemas/common.schema';
import type { SphericalRegionData } from '../schemas/worldProjection.schema';
import {
  projectCubeSphereLocal,
  projectSphericalRegion,
  type SphericalSurfaceFrame,
} from './CubeSphereProjection';

const localBounds = {
  center: [0, 0, 0] as Vec3,
  size: [2, 2, 2] as Vec3,
};

describe('cube-sphere projection', () => {
  it('projects each cube face center to deterministic sphere frames', () => {
    expect(projectCenter('front')).toMatchObject({
      position: [0, 0, 10],
      normal: [0, 0, 1],
      tangent: [1, 0, 0],
      bitangent: [0, 1, 0],
    });
    expect(projectCenter('back')).toMatchObject({
      position: [0, 0, -10],
      normal: [0, 0, -1],
      tangent: [-1, 0, 0],
      bitangent: [0, 1, 0],
    });
    expect(projectCenter('right')).toMatchObject({
      position: [10, 0, 0],
      normal: [1, 0, 0],
      tangent: [0, 0, -1],
      bitangent: [0, 1, 0],
    });
    expect(projectCenter('left')).toMatchObject({
      position: [-10, 0, 0],
      normal: [-1, 0, 0],
      tangent: [0, 0, 1],
      bitangent: [0, 1, 0],
    });
    expect(projectCenter('top')).toMatchObject({
      position: [0, 10, 0],
      normal: [0, 1, 0],
      tangent: [1, 0, 0],
      bitangent: [0, 0, -1],
    });
    expect(projectCenter('bottom')).toMatchObject({
      position: [0, -10, 0],
      normal: [0, -1, 0],
      tangent: [1, 0, 0],
      bitangent: [0, 0, 1],
    });
  });

  it('keeps seam positions and corner normalization deterministic', () => {
    const frontRightEdge = projectCubeSphereLocal({
      face: 'front',
      localBounds,
      localPosition: [1, 0, 0],
      radius: 10,
    });
    const rightFrontEdge = projectCubeSphereLocal({
      face: 'right',
      localBounds,
      localPosition: [-1, 0, 0],
      radius: 10,
    });
    const frontTopRightCorner = projectCubeSphereLocal({
      face: 'front',
      localBounds,
      localPosition: [1, 0, 1],
      radius: 10,
    });

    expect(frontRightEdge.position).toEqual(rightFrontEdge.position);
    expect(frontRightEdge.normal).toEqual(rightFrontEdge.normal);
    expect(frontTopRightCorner.position).toEqual([5.773503, 5.773503, 5.773503]);
    expect(frontTopRightCorner.normal).toEqual([0.57735, 0.57735, 0.57735]);
  });

  it('applies radius scaling and local height above the surface', () => {
    const frame = projectCubeSphereLocal({
      face: 'front',
      localBounds,
      localPosition: [0, 2, 0],
      radius: 5,
    });

    expect(frame.position).toEqual([0, 0, 7]);
    expect(vectorLength(frame.position)).toBeCloseTo(7);
  });

  it('uses region bounds and local yaw to rotate the tangent frame', () => {
    const region: SphericalRegionData = {
      id: 'city',
      name: 'City Region',
      label: 'City',
      face: 'front',
      localBounds: {
        center: [10, 0, 20],
        size: [4, 2, 4],
      },
    };
    const frame = projectSphericalRegion({
      localPosition: [10, 0, 20],
      localYaw: Math.PI / 2,
      radius: 10,
      region,
    });

    expect(frame.tangent).toEqual([0, 1, 0]);
    expect(frame.bitangent).toEqual([-1, 0, 0]);
    expect(applyQuaternionToVector([0, 1, 0], frame.rotation)).toEqual(frame.normal);
  });

  it('rejects invalid faces, radius, bounds, coordinates, and yaw', () => {
    expect(() =>
      projectCubeSphereLocal({
        face: 'front',
        localBounds,
        localPosition: [0, 0, 0],
        radius: 0,
      }),
    ).toThrow('radius must be greater than zero.');
    expect(() =>
      projectCubeSphereLocal({
        face: 'front',
        localBounds: {
          center: [0, 0, 0],
          size: [0, 2, 2],
        },
        localPosition: [0, 0, 0],
        radius: 10,
      }),
    ).toThrow('localBounds.size.0 must be greater than zero.');
    expect(() =>
      projectCubeSphereLocal({
        face: 'front',
        localBounds,
        localPosition: [Number.NaN, 0, 0],
        radius: 10,
      }),
    ).toThrow('localPosition.0 must be finite.');
    expect(() =>
      projectCubeSphereLocal({
        face: 'front',
        localBounds,
        localPosition: [0, 0, 0],
        localYaw: Number.POSITIVE_INFINITY,
        radius: 10,
      }),
    ).toThrow('localYaw must be finite.');
    expect(() =>
      projectCubeSphereLocal({
        face: 'diagonal' as 'front',
        localBounds,
        localPosition: [0, 0, 0],
        radius: 10,
      }),
    ).toThrow('Unsupported cube-sphere face "diagonal".');
  });
});

function projectCenter(face: Parameters<typeof projectCubeSphereLocal>[0]['face']) {
  return projectCubeSphereLocal({
    face,
    localBounds,
    localPosition: [0, 0, 0],
    radius: 10,
  });
}

function vectorLength(vector: Vec3): number {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function applyQuaternionToVector(vector: Vec3, quat: SphericalSurfaceFrame['rotation']): Vec3 {
  const [qx, qy, qz, qw] = quat;
  const uv: Vec3 = [
    qy * vector[2] - qz * vector[1],
    qz * vector[0] - qx * vector[2],
    qx * vector[1] - qy * vector[0],
  ];
  const uuv: Vec3 = [qy * uv[2] - qz * uv[1], qz * uv[0] - qx * uv[2], qx * uv[1] - qy * uv[0]];

  return [
    round(vector[0] + uv[0] * 2 * qw + uuv[0] * 2),
    round(vector[1] + uv[1] * 2 * qw + uuv[1] * 2),
    round(vector[2] + uv[2] * 2 * qw + uuv[2] * 2),
  ];
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
