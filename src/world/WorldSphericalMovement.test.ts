import { describe, expect, it } from 'vitest';

import type { EntityData } from '../schemas/entity.schema';
import type { LevelData } from '../schemas/level.schema';
import { World } from './World';

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
        size: [4, 2, 4],
      },
    },
  ],
};

describe('World spherical movement preview', () => {
  it('updates internal placement state and derived transforms without mutating source level data', () => {
    const level = createLevel([
      createEntity({
        placement: {
          mode: 'spherical-region',
          region: 'city',
        },
      }),
    ]);
    const world = World.fromLevel(level);

    const result = world.stepSphericalMovement(
      'player_spawn_01',
      {
        deltaSeconds: 1,
        forward: 1,
        turn: 0,
      },
      {
        moveSpeed: 1,
      },
    );

    expect(result).toMatchObject({
      ok: true,
      edgeStatus: 'inside',
      state: {
        headingRadians: 0,
        localPosition: [0, 0, 1],
        regionId: 'city',
      },
      placement: {
        transform: {
          position: [0, 4.472136, 8.944272],
          rotation: [0.525731, 0, 0, 0.850651],
          scale: [1, 1, 1],
        },
      },
    });
    expect(world.getEntity('player_spawn_01')?.placement).toMatchObject({
      localPosition: [0, 0, 1],
      localYaw: 0,
      region: 'city',
    });
    expect(level.entities[0]?.placement).toEqual({
      mode: 'spherical-region',
      region: 'city',
    });
  });

  it('reports flat fallback, missing placement, stale region, and invalid input failures', () => {
    const flatWorld = World.fromLevel({
      ...createLevel([createEntity()]),
      worldProjection: undefined,
    });
    const noPlacementWorld = World.fromLevel(createLevel([createEntity()]));
    const staleRegionWorld = World.fromLevel(
      createLevel([
        createEntity({
          placement: {
            mode: 'spherical-region',
            region: 'beach',
          },
        }),
      ]),
    );
    const invalidInputWorld = World.fromLevel(
      createLevel([
        createEntity({
          placement: {
            mode: 'spherical-region',
            region: 'city',
          },
        }),
      ]),
    );
    const movingEntity = 'player_spawn_01';
    const command = {
      deltaSeconds: 1,
      forward: 1,
      turn: 0,
    };

    expect(flatWorld.stepSphericalMovement(movingEntity, command)).toMatchObject({
      ok: false,
      reason: 'missing_world_projection',
    });
    expect(noPlacementWorld.stepSphericalMovement(movingEntity, command)).toMatchObject({
      ok: false,
      reason: 'missing_placement',
    });
    expect(staleRegionWorld.stepSphericalMovement(movingEntity, command)).toMatchObject({
      ok: false,
      reason: 'missing_region',
    });
    expect(
      invalidInputWorld.stepSphericalMovement(movingEntity, {
        ...command,
        deltaSeconds: -1,
      }),
    ).toMatchObject({
      ok: false,
      reason: 'invalid_input',
    });
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
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
    components: {},
    ...overrides,
  };
}
