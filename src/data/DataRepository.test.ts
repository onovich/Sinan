import { describe, expect, it } from 'vitest';

import { DataRepository } from './DataRepository';
import { DataValidationError, type ProjectJsonLoader } from './loadJson';

const fixtures: Record<string, unknown> = {
  'data/assets.manifest.json': {
    schemaVersion: 1,
    assets: {
      'model.switch_wall': {
        type: 'model',
        url: '/models/props/switch_wall.glb',
      },
      'model.door_wood': {
        type: 'model',
        url: '/models/props/door_wood.glb',
      },
    },
  },
  'data/prefabs/switch_wall.json': {
    schemaVersion: 1,
    id: 'switch_wall',
    name: 'Wall Switch',
    model: 'model.switch_wall',
    defaultTransform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
    components: {
      Switch: {
        initialState: false,
      },
    },
  },
  'data/prefabs/door_wood.json': {
    schemaVersion: 1,
    id: 'door_wood',
    name: 'Wood Door',
    model: 'model.door_wood',
    defaultTransform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
    components: {
      Door: {
        locked: true,
        openAngle: 95,
      },
    },
  },
  'data/levels/level_01.json': {
    schemaVersion: 1,
    id: 'level_01',
    name: 'Gate Demo',
    entities: [
      {
        id: 'switch_a',
        prefab: 'switch_wall',
        transform: {
          position: [2, 1, 4],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
        components: {},
      },
      {
        id: 'gate_a',
        prefab: 'door_wood',
        transform: {
          position: [5, 0, 8],
          rotation: [0, 0.7071068, 0, 0.7071068],
          scale: [1, 1, 1],
        },
        components: {},
      },
    ],
    events: ['ev_switch_a_open_gate'],
    timelines: ['tl_open_gate'],
    cameraShots: ['cam_gate_reveal'],
  },
  'data/events/ev_switch_a_open_gate.json': {
    schemaVersion: 1,
    id: 'ev_switch_a_open_gate',
    trigger: {
      type: 'entity.interact',
      entityId: 'switch_a',
    },
    actions: [
      {
        type: 'flag.set',
        flag: 'gate_a_opened',
        value: true,
      },
    ],
  },
};

describe('DataRepository', () => {
  it('loads a level, manifest, and referenced prefabs', async () => {
    const repository = new DataRepository(createFixtureLoader(fixtures));
    const project = await repository.loadProjectLevel('level_01');

    expect(project.assets.assets['model.door_wood']?.type).toBe('model');
    expect(Object.keys(project.prefabs).sort()).toEqual(['door_wood', 'switch_wall']);
    expect(Object.keys(project.events)).toEqual(['ev_switch_a_open_gate']);
    expect(project.level.entities.map((entity) => entity.id)).toEqual(['switch_a', 'gate_a']);
  });

  it('reports schema failures with the source path', async () => {
    const repository = new DataRepository(
      createFixtureLoader({
        ...fixtures,
        'data/prefabs/switch_wall.json': {
          schemaVersion: 1,
          id: 'switch_wall',
          name: 'Wall Switch',
          defaultTransform: {
            position: [0, 0],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
        },
      }),
    );

    await expect(repository.loadPrefab('switch_wall')).rejects.toThrow(DataValidationError);
    await expect(repository.loadPrefab('switch_wall')).rejects.toThrow(
      'data/prefabs/switch_wall.json',
    );
  });
});

function createFixtureLoader(data: Record<string, unknown>): ProjectJsonLoader {
  return {
    loadJson(path: string) {
      if (!(path in data)) {
        throw new Error(`Missing fixture: ${path}`);
      }

      return Promise.resolve(structuredClone(data[path]));
    },
  };
}
