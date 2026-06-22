import { describe, expect, it } from 'vitest';

import type { RuntimeSphericalPlacementDiagnostics } from '../RuntimeTypes';
import { ThreeRuntime } from './ThreeRuntime';

describe('ThreeRuntime spherical placement bridge', () => {
  it('applies derived spherical transforms and clones diagnostics', () => {
    const runtime = new ThreeRuntime();
    const diagnostics = createDiagnostics();

    runtime.instantiateModel('model.player_spawn', 'player_spawn_01');
    runtime.setTransform('player_spawn_01', {
      position: [1, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    });

    runtime.setSphericalPlacements(diagnostics);

    expect(runtime.getTransform('player_spawn_01')).toEqual({
      position: [0, 0, 10],
      rotation: [0.707107, 0, 0, 0.707107],
      scale: [2, 2, 2],
    });
    expect(runtime.getSphericalPlacementDiagnostics()).toEqual(diagnostics);

    const returned = runtime.getSphericalPlacementDiagnostics();
    (returned.placements[0].transform.position as unknown as number[])[0] = 99;

    expect(runtime.getSphericalPlacementDiagnostics()).toEqual(diagnostics);
  });

  it('applies seam and pole placement transforms through the same bridge', () => {
    const runtime = new ThreeRuntime();
    const diagnostics: RuntimeSphericalPlacementDiagnostics = {
      issueCount: 0,
      issues: [],
      placementCount: 2,
      placements: [
        {
          authoredLocalPosition: [1, 0, 0],
          authoredLocalYaw: 0,
          entityId: 'seam_marker',
          regionId: 'city',
          surfaceFrame: {
            position: [7.071068, 0, 7.071068],
            normal: [0.707107, 0, 0.707107],
            tangent: [0.707107, 0, -0.707107],
            bitangent: [0, 1, 0],
            rotation: [0.653282, 0.270598, -0.270598, 0.653282],
          },
          transform: {
            position: [7.071068, 0, 7.071068],
            rotation: [0.653282, 0.270598, -0.270598, 0.653282],
            scale: [1, 1, 1],
          },
        },
        {
          authoredLocalPosition: [0, 0, 0],
          authoredLocalYaw: 0,
          entityId: 'top_marker',
          regionId: 'hill',
          surfaceFrame: {
            position: [0, 10, 0],
            normal: [0, 1, 0],
            tangent: [1, 0, 0],
            bitangent: [0, 0, -1],
            rotation: [0, 0, 0, 1],
          },
          transform: {
            position: [0, 10, 0],
            rotation: [0, 0, 0, 1],
            scale: [0.5, 0.5, 0.5],
          },
        },
      ],
    };

    runtime.createEmpty('seam_marker');
    runtime.createEmpty('top_marker');
    runtime.setSphericalPlacements(diagnostics);

    expect(runtime.getTransform('seam_marker')).toEqual(diagnostics.placements[0].transform);
    expect(runtime.getTransform('top_marker')).toEqual(diagnostics.placements[1].transform);
  });

  it('keeps empty flat fallback diagnostics and clears placement state on dispose', () => {
    const runtime = new ThreeRuntime();

    expect(runtime.getSphericalPlacementDiagnostics()).toEqual({
      issueCount: 0,
      issues: [],
      placementCount: 0,
      placements: [],
    });

    runtime.instantiateModel('model.player_spawn', 'player_spawn_01');
    runtime.setSphericalPlacements(createDiagnostics());
    runtime.dispose();

    expect(runtime.getSphericalPlacementDiagnostics()).toEqual({
      issueCount: 0,
      issues: [],
      placementCount: 0,
      placements: [],
    });
  });
});

function createDiagnostics(): RuntimeSphericalPlacementDiagnostics {
  return {
    issueCount: 0,
    issues: [],
    placementCount: 1,
    placements: [
      {
        authoredLocalPosition: [0, 0, 0],
        authoredLocalYaw: 0,
        entityId: 'player_spawn_01',
        regionId: 'city',
        surfaceFrame: {
          position: [0, 0, 10],
          normal: [0, 0, 1],
          tangent: [1, 0, 0],
          bitangent: [0, 1, 0],
          rotation: [0.707107, 0, 0, 0.707107],
        },
        transform: {
          position: [0, 0, 10],
          rotation: [0.707107, 0, 0, 0.707107],
          scale: [2, 2, 2],
        },
      },
    ],
  };
}
