import { describe, expect, it } from 'vitest';

import type { AssetManifestData } from '../schemas/asset.schema';
import type { EventData } from '../schemas/event.schema';
import type { LevelData } from '../schemas/level.schema';
import type { PaletteData } from '../schemas/palette.schema';
import type { PrefabData } from '../schemas/prefab.schema';
import type { TimelineData } from '../schemas/timeline.schema';
import { validateProject } from './validateProject';

const assets: AssetManifestData = {
  schemaVersion: 1,
  assets: {
    'model.switch_wall': {
      type: 'model',
      url: '/models/props/switch_wall.glb',
    },
  },
};

const palette: PaletteData = {
  schemaVersion: 1,
  id: 'world_01',
  tones: {
    base: '#76b28b',
    accent: '#5aa7d6',
  },
};

const switchPrefab: PrefabData = {
  schemaVersion: 1,
  id: 'switch_wall',
  name: 'Wall Switch',
  model: 'model.switch_wall',
  defaultTransform: {
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  },
  components: {},
};

const doorPrefab: PrefabData = {
  schemaVersion: 1,
  id: 'door_wood',
  name: 'Wood Door',
  model: 'model.door_wood',
  defaultTransform: {
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  },
  components: {},
};

const level: LevelData = {
  schemaVersion: 1,
  id: 'level_01',
  name: 'Gate Demo',
  entities: [
    {
      id: 'switch_a',
      prefab: 'switch_wall',
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      },
      components: {},
    },
  ],
  events: [],
  timelines: [],
  cameraShots: [],
};

const triggerEvent: EventData = {
  schemaVersion: 1,
  id: 'ev_gate_trigger_enter',
  name: 'Gate trigger enter',
  trigger: {
    type: 'trigger.enter',
    triggerId: 'switch_a',
    entityId: 'switch_a',
  },
  actions: [
    {
      type: 'flag.set',
      flag: 'gate_triggered',
      value: true,
    },
  ],
};

const timeline: TimelineData = {
  schemaVersion: 1,
  id: 'tl_open_gate',
  duration: 2,
  tracks: [
    {
      id: 'track_action',
      type: 'action',
      time: 0,
      action: {
        type: 'flag.set',
        flag: 'timeline_flag',
        value: true,
      },
    },
  ],
};

describe('validateProject', () => {
  it('accepts valid project references', () => {
    expect(validateProject({ assets, prefabs: [switchPrefab], levels: [level] }).issues).toEqual(
      [],
    );
  });

  it('reports missing prefab, asset, timeline, and camera shot references', () => {
    const issues = validateProject({
      assets,
      prefabs: [
        {
          ...switchPrefab,
          model: 'model.missing',
        },
      ],
      levels: [
        {
          ...level,
          entities: [
            {
              ...level.entities[0],
              prefab: 'missing_prefab',
            },
          ],
          timelines: ['tl_missing'],
          cameraShots: ['cam_missing'],
        },
      ],
      availableTimelineIds: new Set(),
      availableCameraShotIds: new Set(),
    }).issues;

    expect(issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Missing asset "model.missing".',
        'Missing prefab "missing_prefab".',
        'Missing timeline "tl_missing".',
        'Missing camera shot "cam_missing".',
      ]),
    );
  });

  it('reports asset URL, file, and type problems', () => {
    const issues = validateProject({
      assets: {
        schemaVersion: 1,
        assets: {
          'model.bad_extension': {
            type: 'model',
            url: '/models/bad.txt',
          },
          'audio.missing': {
            type: 'audio',
            url: '/audio/missing.wav',
          },
          'model.not_root_relative': {
            type: 'model',
            url: 'models/not-root.glb',
          },
        },
      },
      prefabs: [],
      levels: [],
      availablePublicAssetUrls: new Set(['/models/bad.txt']),
    }).issues;

    expect(issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Asset type "model" expects one of .glb, .gltf.',
        'Missing asset file "public/audio/missing.wav".',
        'Asset URL "models/not-root.glb" must be a root-relative public path.',
      ]),
    );
  });

  it('reports duplicate entity ids', () => {
    const issues = validateProject({
      assets,
      prefabs: [switchPrefab],
      levels: [
        {
          ...level,
          entities: [level.entities[0], level.entities[0]],
        },
      ],
    }).issues;

    expect(issues.map((issue) => issue.message)).toContain('Duplicate entity id "switch_a".');
  });

  it('reports missing event trigger entity references', () => {
    const issues = validateProject({
      assets,
      prefabs: [switchPrefab],
      levels: [level],
      events: [
        {
          ...triggerEvent,
          trigger: {
            type: 'trigger.enter',
            triggerId: 'missing_trigger',
            entityId: 'missing_actor',
          },
        },
      ],
    }).issues;

    expect(issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Missing trigger target "missing_trigger".',
        'Missing trigger entity "missing_actor".',
      ]),
    );
  });

  it('reports unregistered event and timeline action types', () => {
    const issues = validateProject({
      assets,
      prefabs: [switchPrefab],
      levels: [level],
      events: [triggerEvent],
      timelines: [timeline],
      registeredActionTypes: new Set(['timeline.play']),
    }).issues;

    expect(issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Unregistered action type "flag.set".',
        'Unregistered action type "flag.set".',
      ]),
    );
  });

  it('reports timeline, camera shot, and animation clip reference problems', () => {
    const animatedAssets: AssetManifestData = {
      schemaVersion: 1,
      assets: {
        ...assets.assets,
        'model.door_wood': {
          type: 'model',
          url: '/models/props/door_wood.glb',
          metadata: {
            clips: ['Open'],
          },
        },
      },
    };
    const levelWithGate: LevelData = {
      ...level,
      entities: [
        ...level.entities,
        {
          id: 'gate_a',
          prefab: 'door_wood',
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
          components: {},
        },
      ],
    };
    const issues = validateProject({
      assets: animatedAssets,
      prefabs: [switchPrefab, doorPrefab],
      levels: [levelWithGate],
      timelines: [
        {
          ...timeline,
          tracks: [
            {
              id: 'track_bad_clip',
              type: 'animation.play',
              start: 0,
              entityId: 'gate_a',
              clip: 'Close',
            },
            {
              id: 'track_bad_clip',
              type: 'sound',
              time: 0,
              soundId: 'model.switch_wall',
            },
            {
              id: 'track_missing_target',
              type: 'property',
              target: 'missing_entity',
              property: 'Door.openAmount',
              keys: [{ time: 0, value: 0 }],
            },
          ],
        },
      ],
      cameraShots: [
        {
          schemaVersion: 1,
          id: 'cam_bad',
          type: 'lookAt',
          position: [0, 1, 2],
          target: 'missing_camera_target',
          fov: 50,
        },
      ],
    }).issues;

    expect(issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Duplicate timeline track id "track_bad_clip".',
        'Animation clip "Close" is not listed in metadata.clips for asset "model.door_wood".',
        'Asset "model.switch_wall" must be type "audio", got "model".',
        'Missing entity "missing_entity".',
        'Missing camera lookAt target "missing_camera_target".',
      ]),
    );
  });

  it('reports schema and registry coverage mismatches', () => {
    const issues = validateProject({
      assets,
      prefabs: [switchPrefab],
      levels: [level],
      schemaActionTypes: new Set(['door.open', 'flag.set']),
      registeredActionTypes: new Set(['flag.set']),
      schemaConditionTypes: new Set(['flag.equals']),
      registeredConditionTypes: new Set(['flag.exists']),
    }).issues;

    expect(issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Action schema type "door.open" is not registered.',
        'Condition schema type "flag.equals" is not registered.',
        'Registered condition type "flag.exists" is not in the schema.',
      ]),
    );
  });

  it('reports unregistered condition and custom function names', () => {
    const issues = validateProject({
      assets,
      prefabs: [switchPrefab],
      levels: [level],
      events: [
        {
          ...triggerEvent,
          condition: {
            all: [
              { type: 'flag.equals', flag: 'power_enabled', value: true },
              { type: 'custom.condition', name: 'missing.condition' },
            ],
          },
          actions: [
            {
              type: 'function.call',
              name: 'missing.function',
            },
          ],
        },
      ],
      registeredActionTypes: new Set(['function.call']),
      registeredConditionTypes: new Set(['flag.equals', 'custom.condition']),
      registeredActionFunctionNames: new Set(),
      registeredCustomConditionNames: new Set(),
    }).issues;

    expect(issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Unregistered action function "missing.function".',
        'Unregistered custom condition "missing.condition".',
      ]),
    );
  });

  it('validates render style palette references and default styles', () => {
    const styledPrefab: PrefabData = {
      ...switchPrefab,
      components: {
        Renderable: {
          model: 'model.switch_wall',
          renderStyle: {
            profile: 'palette-toon',
            palette: 'world_01',
            tone: 'accent',
          },
        },
      },
    };
    const defaultStylePrefab: PrefabData = {
      ...switchPrefab,
      id: 'switch_wall_default',
      components: {
        Renderable: {
          model: 'model.switch_wall',
          renderStyle: {
            profile: 'standard',
          },
        },
      },
    };

    expect(
      validateProject({
        assets,
        prefabs: [styledPrefab, defaultStylePrefab],
        levels: [level],
        palettes: [palette],
      }).issues,
    ).toEqual([]);
  });

  it('reports missing render style palettes and tones with actionable paths', () => {
    const styledLevel: LevelData = {
      ...level,
      entities: [
        {
          ...level.entities[0],
          components: {
            Renderable: {
              model: 'model.switch_wall',
              renderStyle: {
                profile: 'palette-toon',
                palette: 'missing_palette',
                tone: 'accent',
              },
            },
          },
        },
        {
          id: 'switch_b',
          prefab: 'switch_wall',
          transform: level.entities[0].transform,
          components: {
            Renderable: {
              model: 'model.switch_wall',
              renderStyle: {
                profile: 'palette-toon',
                palette: 'world_01',
                tone: 'missing_tone',
              },
            },
          },
        },
        {
          id: 'switch_c',
          prefab: 'switch_wall',
          transform: level.entities[0].transform,
          components: {
            Renderable: {
              model: 'model.switch_wall',
              renderStyle: {
                profile: 'palette-toon',
              },
            },
          },
        },
      ],
    };

    const issues = validateProject({
      assets,
      prefabs: [switchPrefab],
      levels: [styledLevel],
      palettes: [palette],
    }).issues;

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'data/levels/level_01.json.entities.switch_a.components.Renderable.renderStyle.palette',
          message: 'Missing palette "missing_palette".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.entities.switch_b.components.Renderable.renderStyle.tone',
          message: 'Palette "world_01" is missing tone "missing_tone".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.entities.switch_c.components.Renderable.renderStyle.palette',
          message: 'Render style profile "palette-toon" requires a palette.',
        }),
      ]),
    );
  });
});
