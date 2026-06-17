import { describe, expect, it } from 'vitest';

import { AssetManifestSchema } from './asset.schema';
import { EntitySchema } from './entity.schema';
import { LevelSchema } from './level.schema';
import { PrefabSchema } from './prefab.schema';
import { TransformSchema } from './transform.schema';

const identityTransform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

describe('core data schemas', () => {
  it('parses neutral transform data', () => {
    expect(TransformSchema.parse(identityTransform)).toEqual(identityTransform);
  });

  it('rejects malformed transform tuples', () => {
    expect(
      TransformSchema.safeParse({
        position: [0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      }).success,
    ).toBe(false);
  });

  it('parses an asset manifest', () => {
    const result = AssetManifestSchema.safeParse({
      schemaVersion: 1,
      assets: {
        'model.door_wood': {
          type: 'model',
          url: '/models/props/door_wood.glb',
        },
        'audio.gate_open': {
          type: 'audio',
          url: '/audio/gate_open.mp3',
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects asset entries without urls', () => {
    const result = AssetManifestSchema.safeParse({
      schemaVersion: 1,
      assets: {
        'model.invalid': {
          type: 'model',
        },
      },
    });

    expect(result.success).toBe(false);
  });

  it('parses prefab component payloads as plain data', () => {
    const result = PrefabSchema.safeParse({
      schemaVersion: 1,
      id: 'door_wood',
      name: 'Wood Door',
      model: 'model.door_wood',
      defaultTransform: identityTransform,
      components: {
        Renderable: {
          model: 'model.door_wood',
        },
        Door: {
          locked: false,
          openAngle: 95,
          openDuration: 0.45,
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('parses level entities and reference id lists', () => {
    const result = LevelSchema.safeParse({
      schemaVersion: 1,
      id: 'level_01',
      name: 'Gate Demo',
      environment: {
        background: '#111111',
        ambientLight: 0.35,
      },
      entities: [
        {
          id: 'switch_a',
          prefab: 'switch_wall',
          transform: {
            position: [2, 1, 4],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
          components: {
            Switch: {
              initialState: false,
            },
            Interactable: {
              prompt: 'Press E',
            },
          },
        },
      ],
      events: ['ev_switch_a_open_gate'],
      timelines: ['tl_open_gate'],
      cameraShots: ['cam_gate_reveal'],
    });

    expect(result.success).toBe(true);
  });

  it('rejects unknown entity fields', () => {
    const result = EntitySchema.safeParse({
      id: 'gate_a',
      prefab: 'door_wood',
      transform: identityTransform,
      components: {},
      object3D: {},
    });

    expect(result.success).toBe(false);
  });
});
