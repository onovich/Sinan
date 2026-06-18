import { describe, expect, it } from 'vitest';

import { AssetManifestSchema } from './asset.schema';
import { AabbColliderComponentSchema, TriggerZoneComponentSchema } from './collider.schema';
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

  it('parses typed asset metadata', () => {
    const result = AssetManifestSchema.safeParse({
      schemaVersion: 1,
      assets: {
        'model.door_wood': {
          type: 'model',
          url: '/models/props/door_wood.glb',
          metadata: {
            category: 'prop',
            materialProfile: 'palette-toon',
            maxTriangles: 512,
            textureBudgetKb: 256,
            sizeBudgetBytes: 16384,
            compressed: false,
            compression: {
              codec: 'draco',
              status: 'required',
              decoder: 'draco',
            },
            textureCompression: {
              codec: 'ktx2',
              status: 'ready',
            },
            lodGroup: 'gate-demo-props',
            instancing: 'eligible',
            clips: ['Open'],
            source: {
              generated: true,
              authoringTool: 'Sinan development GLB generator',
            },
            notes: 'Generated test asset.',
            extras: {
              reviewer: 'phase-17',
            },
          },
        },
        'model.unknown_compression': {
          type: 'model',
          url: '/models/unknown.glb',
          metadata: {
            sizeBudgetBytes: 4096,
            compression: {
              codec: 'meshopt',
              status: 'unknown',
            },
          },
        },
        'texture.noise': {
          type: 'texture',
          url: '/textures/noise.webp',
          metadata: {
            category: 'texture',
            textureUsage: 'noise',
            colorSpace: 'linear',
          },
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects unknown asset metadata fields outside extras', () => {
    const result = AssetManifestSchema.safeParse({
      schemaVersion: 1,
      assets: {
        'model.door_wood': {
          type: 'model',
          url: '/models/props/door_wood.glb',
          metadata: {
            triangleCount: 12,
          },
        },
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid asset budgets and compression metadata', () => {
    const result = AssetManifestSchema.safeParse({
      schemaVersion: 1,
      assets: {
        'model.door_wood': {
          type: 'model',
          url: '/models/props/door_wood.glb',
          metadata: {
            maxTriangles: -1,
            textureBudgetKb: -1,
            sizeBudgetBytes: -1,
            compression: {
              codec: 'zip',
            },
          },
        },
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid texture usage and color space combinations', () => {
    const result = AssetManifestSchema.safeParse({
      schemaVersion: 1,
      assets: {
        'texture.albedo': {
          type: 'texture',
          url: '/textures/albedo.webp',
          metadata: {
            textureUsage: 'color',
            colorSpace: 'linear',
          },
        },
        'texture.mask': {
          type: 'texture',
          url: '/textures/mask.webp',
          metadata: {
            textureUsage: 'mask',
            colorSpace: 'srgb',
          },
        },
      },
    });

    expect(result.success).toBe(false);
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
        fog: {
          enabled: true,
          color: '#162024',
          near: 8,
          far: 18,
        },
        colorGrade: {
          enabled: true,
          exposure: 1.05,
          saturation: 1.08,
        },
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

  it('rejects invalid level environment render controls', () => {
    const baseLevel = {
      schemaVersion: 1,
      id: 'level_01',
      name: 'Gate Demo',
      entities: [],
      events: [],
      timelines: [],
      cameraShots: [],
    };

    expect(
      LevelSchema.safeParse({
        ...baseLevel,
        environment: {
          fog: {
            enabled: true,
            near: 20,
            far: 8,
          },
        },
      }).success,
    ).toBe(false);
    expect(
      LevelSchema.safeParse({
        ...baseLevel,
        environment: {
          colorGrade: {
            enabled: true,
            saturation: 4,
          },
        },
      }).success,
    ).toBe(false);
  });

  it('parses collider and trigger zone component payloads', () => {
    expect(
      AabbColliderComponentSchema.safeParse({
        shape: 'aabb',
        center: [0, 1, 0],
        size: [1, 2, 1],
        isTrigger: true,
      }).success,
    ).toBe(true);
    expect(TriggerZoneComponentSchema.safeParse({ enabled: true }).success).toBe(true);
    expect(AabbColliderComponentSchema.safeParse({ shape: 'sphere', radius: 1 }).success).toBe(
      false,
    );
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
