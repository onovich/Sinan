import { describe, expect, it } from 'vitest';

import type { LevelData } from '../schemas/level.schema';
import type { TransformData } from '../schemas/transform.schema';
import { World } from './World';

const defaultTransform: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

describe('World', () => {
  it('initializes from level data and snapshots entities deterministically', () => {
    const world = World.fromLevel(createLevel());

    expect(world.getEntityIds()).toEqual(['switch_a', 'gate_a']);
    expect(world.getEntity('switch_a')).toMatchObject({
      id: 'switch_a',
      prefab: 'switch_wall',
    });
    expect(world.snapshot()).toEqual({
      entityCount: 2,
      levelId: 'level_01',
      entities: [
        {
          componentTypes: ['Switch'],
          id: 'switch_a',
          name: undefined,
          prefab: 'switch_wall',
          transform: defaultTransform,
        },
        {
          componentTypes: ['Door'],
          id: 'gate_a',
          name: undefined,
          prefab: 'door_wood',
          transform: {
            position: [5, 0, 8],
            rotation: [0, 0.7071068, 0, 0.7071068],
            scale: [1, 1, 1],
          },
        },
      ],
    });
  });

  it('updates transforms without mutating the source level data', () => {
    const level = createLevel();
    const world = World.fromLevel(level);
    const nextTransform: TransformData = {
      position: [1, 2, 3],
      rotation: [0, 0, 0, 1],
      scale: [2, 2, 2],
    };

    expect(world.setTransform('switch_a', nextTransform)).toEqual({
      ok: true,
      entityId: 'switch_a',
      transform: nextTransform,
    });
    expect(world.getTransform('switch_a')).toEqual(nextTransform);
    expect(level.entities[0]?.transform).toEqual(defaultTransform);
  });

  it('returns failure results for missing entities and invalid transforms', () => {
    const world = World.fromLevel(createLevel());

    expect(world.setTransform('missing', defaultTransform)).toEqual({
      ok: false,
      entityId: 'missing',
      message: 'World entity "missing" does not exist.',
      reason: 'missing_entity',
    });
    expect(world.setTransform('switch_a', { position: [1, 2, 3] })).toEqual({
      ok: false,
      entityId: 'switch_a',
      message: 'Invalid transform for world entity "switch_a".',
      reason: 'invalid_transform',
    });
  });

  it('returns clones from entity and transform reads', () => {
    const world = World.fromLevel(createLevel());
    const entity = world.getEntity('switch_a');
    const transform = world.getTransform('switch_a');

    if (!entity || !transform) {
      throw new Error('Expected switch_a to exist.');
    }

    entity.transform.position[0] = 99;
    transform.position[0] = 42;

    expect(world.getTransform('switch_a')).toEqual(defaultTransform);
  });
});

function createLevel(): LevelData {
  return {
    schemaVersion: 1,
    id: 'level_01',
    name: 'Gate Demo',
    entities: [
      {
        id: 'switch_a',
        prefab: 'switch_wall',
        transform: defaultTransform,
        components: {
          Switch: {
            initialState: false,
          },
        },
      },
      {
        id: 'gate_a',
        prefab: 'door_wood',
        transform: {
          position: [5, 0, 8],
          rotation: [0, 0.7071068, 0, 0.7071068],
          scale: [1, 1, 1],
        },
        components: {
          Door: {
            locked: true,
          },
        },
      },
    ],
    events: [],
    timelines: [],
    cameraShots: [],
  };
}
