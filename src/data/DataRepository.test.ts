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
      Renderable: {
        model: 'model.switch_wall',
        renderStyle: {
          profile: 'palette-toon',
          palette: 'world_01',
          tone: 'accent',
        },
      },
      Switch: {
        initialState: false,
      },
    },
  },
  'data/palettes/world_01.json': {
    schemaVersion: 1,
    id: 'world_01',
    tones: {
      base: '#76b28b',
      accent: '#5aa7d6',
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
  'data/timelines/tl_open_gate.json': {
    schemaVersion: 1,
    id: 'tl_open_gate',
    duration: 4,
    tracks: [
      {
        id: 'track_set_flag',
        type: 'action',
        time: 3,
        action: {
          type: 'flag.set',
          flag: 'gate_a_opened',
          value: true,
        },
      },
    ],
  },
  'data/cameraShots/cam_gate_reveal.json': {
    schemaVersion: 1,
    id: 'cam_gate_reveal',
    type: 'keyframed',
    duration: 2,
    keys: [
      {
        time: 0,
        position: [2, 1.6, 5],
        lookAt: 'gate_a',
        fov: 55,
      },
      {
        time: 2,
        position: [5, 2.2, 9],
        lookAt: 'gate_a',
        fov: 38,
      },
    ],
  },
  'data/social/avatars.json': [],
  'data/social/emotes.json': [],
  'data/social/presets.json': [],
  'data/social/stamps.json': [],
};

describe('DataRepository', () => {
  it('loads a level, manifest, and referenced prefabs', async () => {
    const repository = new DataRepository(createFixtureLoader(fixtures));
    const project = await repository.loadProjectLevel('level_01');

    expect(project.assets.assets['model.door_wood']?.type).toBe('model');
    expect(Object.keys(project.prefabs).sort()).toEqual(['door_wood', 'switch_wall']);
    expect(Object.keys(project.palettes)).toEqual(['world_01']);
    expect(Object.keys(project.events)).toEqual(['ev_switch_a_open_gate']);
    expect(Object.keys(project.timelines)).toEqual(['tl_open_gate']);
    expect(Object.keys(project.cameraShots)).toEqual(['cam_gate_reveal']);
    expect(project.socialAvatars).toEqual([]);
    expect(project.socialEmotes).toEqual([]);
    expect(project.socialPresets).toEqual([]);
    expect(project.socialStamps).toEqual([]);
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
