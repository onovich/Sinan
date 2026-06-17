import { describe, expect, it } from 'vitest';

import type { AssetManifestData } from '../schemas/asset.schema';
import type { EventData } from '../schemas/event.schema';
import type { LevelData } from '../schemas/level.schema';
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
});
