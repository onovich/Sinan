import { describe, expect, it } from 'vitest';

import type { EntityData } from '../schemas/entity.schema';
import type { LevelData } from '../schemas/level.schema';
import type { TransformData } from '../schemas/transform.schema';
import { deriveSphericalPlacements } from './SphericalPlacement';
import { World } from './World';

const defaultTransform: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

const worldProjection: NonNullable<LevelData['worldProjection']> = {
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
        size: [2, 2, 2],
      },
    },
  ],
};

describe('spherical placement derivation', () => {
  it('uses flat-level fallback when no entity has spherical placement', () => {
    expect(
      deriveSphericalPlacements({
        entities: [createEntity()],
        levelId: 'level_01',
      }),
    ).toEqual({
      issueCount: 0,
      issues: [],
      placementCount: 0,
      placements: [],
    });
  });

  it('derives runtime transform from authored local source data', () => {
    const snapshot = deriveSphericalPlacements({
      entities: [
        createEntity({
          transform: {
            position: [0, 2, 0],
            rotation: [0, 0, 0, 1],
            scale: [2, 3, 4],
          },
          placement: {
            mode: 'spherical-region',
            region: 'city',
          },
        }),
      ],
      levelId: 'level_01',
      worldProjection,
    });

    expect(snapshot.issueCount).toBe(0);
    expect(snapshot.placements).toEqual([
      expect.objectContaining({
        authoredLocalPosition: [0, 2, 0],
        authoredLocalYaw: 0,
        entityId: 'player_spawn_01',
        regionId: 'city',
        transform: {
          position: [0, 0, 12],
          rotation: [0.707107, 0, 0, 0.707107],
          scale: [2, 3, 4],
        },
      }),
    ]);
  });

  it('lets placement local position and yaw override transform position for projection', () => {
    const snapshot = deriveSphericalPlacements({
      entities: [
        createEntity({
          transform: {
            position: [1, 0, 0],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
          placement: {
            mode: 'spherical-region',
            region: 'city',
            localPosition: [0, 0, 0],
            localYaw: Math.PI / 2,
          },
        }),
        createEntity({
          id: 'flat_marker',
        }),
      ],
      levelId: 'level_01',
      worldProjection,
    });

    expect(snapshot.placementCount).toBe(1);
    expect(snapshot.placements[0]).toMatchObject({
      authoredLocalPosition: [0, 0, 0],
      authoredLocalYaw: Math.PI / 2,
      surfaceFrame: {
        tangent: [0, 1, 0],
        bitangent: [-1, 0, 0],
      },
      transform: {
        position: [0, 0, 10],
      },
    });
  });

  it('reports missing world projection and stale region references', () => {
    const withoutProjection = deriveSphericalPlacements({
      entities: [
        createEntity({
          placement: {
            mode: 'spherical-region',
            region: 'city',
          },
        }),
      ],
      levelId: 'level_01',
    });
    const staleRegion = deriveSphericalPlacements({
      entities: [
        createEntity({
          placement: {
            mode: 'spherical-region',
            region: 'beach',
          },
        }),
      ],
      levelId: 'level_01',
      worldProjection,
    });

    expect(withoutProjection.issues).toEqual([
      {
        entityId: 'player_spawn_01',
        message:
          'Entity "player_spawn_01" uses spherical placement but level "level_01" has no worldProjection.',
        reason: 'missing_world_projection',
        regionId: 'city',
      },
    ]);
    expect(staleRegion.issues).toEqual([
      {
        entityId: 'player_spawn_01',
        message: 'Entity "player_spawn_01" references missing spherical region "beach".',
        reason: 'missing_region',
        regionId: 'beach',
      },
    ]);
  });

  it('reports invalid projection inputs with entity context', () => {
    const snapshot = deriveSphericalPlacements({
      entities: [
        createEntity({
          transform: {
            position: [Number.NaN, 0, 0],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
          placement: {
            mode: 'spherical-region',
            region: 'city',
          },
        }),
      ],
      levelId: 'level_01',
      worldProjection,
    });

    expect(snapshot.issues).toEqual([
      {
        entityId: 'player_spawn_01',
        message: 'localPosition.0 must be finite.',
        reason: 'invalid_projection',
        regionId: 'city',
      },
    ]);
  });

  it('derives placement from current World transforms without mutating source data', () => {
    const level = createLevel([
      createEntity({
        placement: {
          mode: 'spherical-region',
          region: 'city',
        },
      }),
    ]);
    const world = World.fromLevel(level);

    expect(world.getSphericalPlacements().placements[0]?.transform.position).toEqual([0, 0, 10]);
    expect(
      world.setTransform('player_spawn_01', {
        position: [0, 2, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      }),
    ).toMatchObject({ ok: true });
    expect(world.getSphericalPlacements().placements[0]?.transform.position).toEqual([0, 0, 12]);
    expect(level.entities[0]?.transform.position).toEqual([0, 0, 0]);
  });
});

function createLevel(entities: EntityData[]): LevelData {
  return {
    schemaVersion: 1,
    id: 'level_01',
    name: 'Gate Demo',
    worldProjection,
    entities,
    events: [],
    timelines: [],
    cameraShots: [],
  };
}

function createEntity(overrides: Partial<EntityData> = {}): EntityData {
  return {
    id: 'player_spawn_01',
    prefab: 'player_spawn',
    transform: defaultTransform,
    components: {},
    ...overrides,
  };
}
