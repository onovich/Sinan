import { describe, expect, it } from 'vitest';

import type { WorldProjectionData } from '../schemas/worldProjection.schema';
import { stepSurfaceMovement, type SurfaceMovementState } from './SurfaceMovement';

const projection: WorldProjectionData = {
  type: 'cube-sphere',
  radius: 10,
  regions: [
    {
      id: 'city',
      name: 'City Region',
      label: 'City',
      face: 'front',
      localBounds: {
        center: [0, 0, 0],
        size: [4, 2, 4],
      },
    },
    {
      id: 'hill',
      name: 'Hill Region',
      label: 'Hill',
      face: 'top',
      localBounds: {
        center: [0, 0, 0],
        size: [2, 2, 2],
      },
    },
  ],
};

const initialState: SurfaceMovementState = {
  headingRadians: 0,
  localPosition: [0, 0, 0],
  regionId: 'city',
};

describe('surface movement', () => {
  it('keeps zero input deterministic and projects the current surface frame', () => {
    const result = stepSurfaceMovement({
      command: {
        deltaSeconds: 0,
        forward: 0,
        turn: 0,
      },
      projection,
      state: initialState,
    });

    expect(result).toMatchObject({
      ok: true,
      edgeStatus: 'inside',
      state: initialState,
      surfaceFrame: {
        position: [0, 0, 10],
        normal: [0, 0, 1],
      },
    });
  });

  it('moves forward in region-local coordinates and returns a new surface frame', () => {
    const result = stepSurfaceMovement({
      command: {
        deltaSeconds: 1,
        forward: 1,
        turn: 0,
      },
      options: {
        moveSpeed: 1.5,
      },
      projection,
      state: initialState,
    });

    expect(result).toMatchObject({
      ok: true,
      edgeStatus: 'inside',
      state: {
        headingRadians: 0,
        localPosition: [0, 0, 1.5],
        regionId: 'city',
      },
    });
    expect(result.ok ? result.surfaceFrame.position : undefined).toEqual([0, 6, 8]);
  });

  it('turns before moving and wraps heading deterministically', () => {
    const result = stepSurfaceMovement({
      command: {
        deltaSeconds: 1,
        forward: 1,
        turn: 1,
      },
      options: {
        moveSpeed: 1,
        turnSpeed: Math.PI / 2,
      },
      projection,
      state: {
        ...initialState,
        headingRadians: Math.PI * 2,
      },
    });

    expect(result).toMatchObject({
      ok: true,
      state: {
        headingRadians: 1.570796,
        localPosition: [1, 0, 0],
        regionId: 'city',
      },
    });
  });

  it('clamps edge crossings instead of changing regions', () => {
    const result = stepSurfaceMovement({
      command: {
        deltaSeconds: 1,
        forward: 1,
        turn: 0,
      },
      options: {
        moveSpeed: 1,
      },
      projection,
      state: {
        headingRadians: 0,
        localPosition: [0, 0, 1.75],
        regionId: 'city',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      edgeStatus: 'clamped',
      state: {
        headingRadians: 0,
        localPosition: [0, 0, 2],
        regionId: 'city',
      },
    });
  });

  it('handles top-face pole-like movement with the same deterministic rules', () => {
    const result = stepSurfaceMovement({
      command: {
        deltaSeconds: 1,
        forward: 1,
        turn: 1,
      },
      options: {
        moveSpeed: 2,
        turnSpeed: Math.PI / 2,
      },
      projection,
      state: {
        headingRadians: 0,
        localPosition: [0.75, 0, 0],
        regionId: 'hill',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      edgeStatus: 'clamped',
      state: {
        headingRadians: 1.570796,
        localPosition: [1, 0, 0],
        regionId: 'hill',
      },
      surfaceFrame: {
        normal: [0.707107, 0.707107, 0],
      },
    });
  });

  it('reports stale regions and invalid movement input without mutating state', () => {
    const stale = stepSurfaceMovement({
      command: {
        deltaSeconds: 1,
        forward: 1,
        turn: 0,
      },
      projection,
      state: {
        ...initialState,
        regionId: 'beach',
      },
    });
    const invalid = stepSurfaceMovement({
      command: {
        deltaSeconds: -1,
        forward: 1,
        turn: 0,
      },
      projection,
      state: initialState,
    });

    expect(stale).toEqual({
      ok: false,
      message: 'Missing spherical movement region "beach".',
      reason: 'missing_region',
      state: {
        ...initialState,
        regionId: 'beach',
      },
    });
    expect(invalid).toEqual({
      ok: false,
      message: 'deltaSeconds must be nonnegative.',
      reason: 'invalid_input',
      state: initialState,
    });
  });
});
