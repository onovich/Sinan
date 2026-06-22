import { describe, expect, it } from 'vitest';

import type { WorldProjectionData } from '../schemas/worldProjection.schema';
import { sampleSurfaceFollowCamera, type SurfaceFollowCameraResult } from './SphericalCamera';

const projection: WorldProjectionData = {
  radius: 10,
  regions: [
    {
      face: 'front',
      id: 'city',
      label: 'City',
      localBounds: {
        center: [0, 0, 0],
        size: [4, 2, 4],
      },
      name: 'City Region',
    },
    {
      face: 'right',
      id: 'hill',
      label: 'Hill',
      localBounds: {
        center: [0, 0, 0],
        size: [4, 2, 4],
      },
      name: 'Hill Region',
    },
    {
      face: 'top',
      id: 'peak',
      label: 'Peak',
      localBounds: {
        center: [0, 0, 0],
        size: [2, 2, 2],
      },
      name: 'Peak Region',
    },
  ],
  type: 'cube-sphere',
};

describe('spherical follow camera', () => {
  it('keeps flat levels on y-up camera poses', () => {
    const result = sampleSurfaceFollowCamera({
      far: 100,
      fov: 55,
      near: 0.1,
      target: {
        mode: 'flat',
        offset: [0, 3, -6],
        targetPosition: [1, 2, 3],
      },
    });

    expect(result).toEqual({
      mode: 'flat',
      ok: true,
      pose: {
        far: 100,
        fov: 55,
        lookAt: [1, 2, 3],
        near: 0.1,
        position: [1, 5, -3],
        up: [0, 1, 0],
      },
    });
  });

  it('samples a surface-relative follow pose with fov and clip planes preserved', () => {
    const result = sampleSurfaceFollowCamera({
      distance: 4,
      far: 120,
      fov: 50,
      height: 2,
      near: 0.2,
      projection,
      target: {
        headingRadians: 0,
        localPosition: [0, 0, 0],
        mode: 'spherical',
        regionId: 'city',
      },
      targetHeight: 1,
    });

    expect(result).toMatchObject({
      mode: 'spherical',
      ok: true,
      pose: {
        far: 120,
        fov: 50,
        lookAt: [0, 0, 11],
        near: 0.2,
        position: [0, -4, 13],
        up: [0, 0, 1],
      },
      surfaceFrame: {
        bitangent: [0, 1, 0],
        normal: [0, 0, 1],
      },
    });
  });

  it('keeps horizon up vectors stable across region transitions', () => {
    const city = sampleSurfaceFollowCamera({
      distance: 4,
      fov: 50,
      height: 2,
      projection,
      target: {
        localPosition: [0, 0, 0],
        mode: 'spherical',
        regionId: 'city',
      },
      targetHeight: 1,
    });
    const hill = sampleSurfaceFollowCamera({
      distance: 4,
      fov: 50,
      height: 2,
      projection,
      target: {
        localPosition: [0, 0, 0],
        mode: 'spherical',
        regionId: 'hill',
      },
      targetHeight: 1,
    });

    expect(city).toMatchObject({
      ok: true,
      pose: {
        position: [0, -4, 13],
        up: [0, 0, 1],
      },
    });
    expect(hill).toMatchObject({
      ok: true,
      pose: {
        position: [13, -4, 0],
        up: [1, 0, 0],
      },
    });
  });

  it('keeps seam and pole-like samples finite and surface-up aligned', () => {
    const seam = sampleSurfaceFollowCamera({
      distance: 3,
      fov: 48,
      height: 1,
      projection,
      target: {
        localPosition: [2, 0, 0],
        mode: 'spherical',
        regionId: 'city',
      },
    });
    const peak = sampleSurfaceFollowCamera({
      distance: 2,
      fov: 48,
      height: 1,
      projection,
      target: {
        headingRadians: Math.PI / 2,
        localPosition: [0, 0, 0],
        mode: 'spherical',
        regionId: 'peak',
      },
    });

    expect(seam).toMatchObject({
      ok: true,
      pose: {
        up: [0.707107, 0, 0.707107],
      },
      surfaceFrame: {
        normal: [0.707107, 0, 0.707107],
      },
    });
    expect(peak).toMatchObject({
      ok: true,
      pose: {
        up: [0, 1, 0],
      },
      surfaceFrame: {
        normal: [0, 1, 0],
      },
    });
    expectFinitePoseVectors(seam);
    expectFinitePoseVectors(peak);
  });

  it('reports missing projection, stale regions, and invalid inputs', () => {
    expect(
      sampleSurfaceFollowCamera({
        distance: 4,
        fov: 50,
        height: 2,
        target: {
          localPosition: [0, 0, 0],
          mode: 'spherical',
          regionId: 'city',
        },
      }),
    ).toEqual({
      message: 'Spherical camera target "city" requires a worldProjection.',
      ok: false,
      reason: 'missing_world_projection',
    });
    expect(
      sampleSurfaceFollowCamera({
        distance: 4,
        fov: 50,
        height: 2,
        projection,
        target: {
          localPosition: [0, 0, 0],
          mode: 'spherical',
          regionId: 'beach',
        },
      }),
    ).toEqual({
      message: 'Missing spherical camera region "beach".',
      ok: false,
      reason: 'missing_region',
    });
    expect(
      sampleSurfaceFollowCamera({
        distance: -1,
        fov: 50,
        height: 2,
        projection,
        target: {
          localPosition: [0, 0, 0],
          mode: 'spherical',
          regionId: 'city',
        },
      }),
    ).toEqual({
      message: 'distance must be nonnegative.',
      ok: false,
      reason: 'invalid_input',
    });
  });
});

function expectFinitePoseVectors(result: SurfaceFollowCameraResult): void {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    return;
  }

  expect(result.pose.lookAt).toBeDefined();
  expect(result.pose.up).toBeDefined();

  const values = [
    ...result.pose.position,
    ...(result.pose.lookAt ?? []),
    ...(result.pose.up ?? []),
  ];

  for (const value of values) {
    expect(Number.isFinite(value)).toBe(true);
  }
}
