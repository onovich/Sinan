import { describe, expect, it } from 'vitest';

import type { ProjectData } from '../data/DataRepository';
import type {
  RuntimeDebugAabb,
  RuntimeRenderStyle,
  RuntimeRenderableMaterialSlots,
  RuntimeSize,
  RuntimeStyleQualityProfile,
  RuntimeStyleResources,
} from '../runtime/RuntimeTypes';
import type { WebRuntime } from '../runtime/WebRuntime';
import type { TransformData } from '../schemas/transform.schema';
import { EngineSession } from './EngineSession';

const transform: TransformData = {
  position: [1, 2, 3],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

describe('EngineSession', () => {
  it('loads project data into world and synchronizes runtime objects', async () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      runtime: createRuntimeProbe(calls),
      styleQualityProfile: 'low-end',
    });

    const world = await session.loadProject(createProject());

    expect(session.getStatus()).toBe('loaded');
    expect(session.getWorld()).toBe(world);
    expect(world?.snapshot()).toMatchObject({
      entityCount: 1,
      levelId: 'level_01',
    });
    expect(calls).toEqual([
      { type: 'styleQuality', profile: 'low-end' },
      {
        type: 'styleResources',
        resources: {
          palettes: {
            world_01: {
              id: 'world_01',
              tones: {
                accent: '#5aa7d6',
                base: '#76b28b',
              },
            },
          },
        },
      },
      {
        type: 'environment',
        environment: {
          ambientLight: 0.35,
          background: '#111111',
        },
      },
      { type: 'loadModel', assetId: 'model.switch_wall', url: '/models/props/switch_wall.glb' },
      { type: 'instantiateModel', assetId: 'model.switch_wall', entityId: 'switch_a' },
      { type: 'setTransform', entityId: 'switch_a', transform },
      {
        type: 'setRenderStyle',
        entityId: 'switch_a',
        style: {
          highlight: 'selected',
          outline: 'interactable',
          palette: 'world_01',
          profile: 'palette-toon',
          tone: 'accent',
        },
      },
      {
        type: 'setRenderableMaterials',
        entityId: 'switch_a',
        materials: {
          main: {
            materialId: 'debug.uv-gradient',
            parameters: {
              strength: 0.5,
            },
          },
        },
      },
      { type: 'setDebugAabb', entityId: 'switch_a', bounds: undefined },
    ]);
  });

  it('delegates frame update, render, resize, selection, and disposal', () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      mode: 'play',
      runtime: createRuntimeProbe(calls),
    });

    session.step(0.05);
    session.resize({ height: 600, pixelRatio: 2, width: 800 });
    session.setSelectedEntity('switch_a');
    session.dispose();
    session.dispose();

    expect(calls).toEqual([
      { type: 'update', deltaSeconds: 0.05 },
      { type: 'render' },
      { type: 'resize', size: { height: 600, pixelRatio: 2, width: 800 } },
      { type: 'setSelectedEntity', entityId: 'switch_a' },
      { type: 'dispose' },
    ]);
    expect(session.getMode()).toBe('play');
    expect(session.getStatus()).toBe('disposed');
    expect(() => session.step(0.016)).toThrow('EngineSession has been disposed.');
  });

  it('delegates material parameter updates through the runtime', () => {
    const calls: unknown[] = [];
    const session = new EngineSession({ runtime: createRuntimeProbe(calls) });

    session.setMaterialParameter({
      entityId: 'gate_a',
      slot: 'main',
      parameter: 'progress',
      value: 0.5,
    });

    expect(calls).toEqual([
      {
        type: 'setMaterialParameter',
        update: {
          entityId: 'gate_a',
          slot: 'main',
          parameter: 'progress',
          value: 0.5,
        },
      },
    ]);
  });

  it('syncs trigger debug helpers from renderer-neutral collider data', async () => {
    const calls: unknown[] = [];
    const session = new EngineSession({ runtime: createRuntimeProbe(calls) });

    await session.loadProject(createProject());
    session.setTriggerDebugVisible(true);

    expect(calls).toContainEqual({
      type: 'setDebugAabb',
      entityId: 'switch_a',
      bounds: {
        center: [1, 2, 3],
        color: '#f4bd4e',
        size: [2, 2, 2],
        visible: true,
      },
    });
  });
});

function createRuntimeProbe(calls: unknown[]): WebRuntime {
  return {
    init: () => undefined,
    loadModel: (assetId, url) => {
      calls.push({ type: 'loadModel', assetId, url });

      return Promise.resolve({ assetId });
    },
    instantiateModel: (assetId, entityId) => {
      calls.push({ type: 'instantiateModel', assetId, entityId });

      return { entityId, runtimeObjectId: entityId };
    },
    createEmpty: (entityId) => {
      calls.push({ type: 'createEmpty', entityId });

      return { entityId, runtimeObjectId: entityId };
    },
    destroyObject: (entityId) => calls.push({ type: 'destroyObject', entityId }),
    setTransform: (entityId, runtimeTransform) =>
      calls.push({ type: 'setTransform', entityId, transform: runtimeTransform }),
    getTransform: () => null,
    setVisible: () => undefined,
    playAnimation: () => undefined,
    stopAnimation: () => undefined,
    setAnimationTime: () => undefined,
    setCameraPose: () => undefined,
    setDebugAabb: (entityId: string, bounds: RuntimeDebugAabb | undefined) => {
      calls.push({ type: 'setDebugAabb', entityId, bounds });
    },
    setStyleResources: (resources: RuntimeStyleResources) => {
      calls.push({ type: 'styleResources', resources });
    },
    setRenderEnvironment: (environment) => {
      calls.push({ type: 'environment', environment });
    },
    setRenderStyle: (entityId: string, style: RuntimeRenderStyle | undefined) => {
      calls.push({ type: 'setRenderStyle', entityId, style });
    },
    setRenderableMaterials: (
      entityId: string,
      materials: RuntimeRenderableMaterialSlots | undefined,
    ) => {
      calls.push({ type: 'setRenderableMaterials', entityId, materials });
    },
    setMaterialParameter: (update) => {
      calls.push({ type: 'setMaterialParameter', update });
    },
    setStyleQualityProfile: (profile: RuntimeStyleQualityProfile) => {
      calls.push({ type: 'styleQuality', profile });
    },
    setSelectedEntity: (entityId) => {
      calls.push({ type: 'setSelectedEntity', entityId });
    },
    pick: () => null,
    attachTransformGizmo: () => undefined,
    detachTransformGizmo: () => undefined,
    setTransformGizmoMode: () => undefined,
    update: (deltaSeconds: number) => calls.push({ type: 'update', deltaSeconds }),
    render: () => calls.push({ type: 'render' }),
    resize: (size: RuntimeSize) => calls.push({ type: 'resize', size }),
    dispose: () => calls.push({ type: 'dispose' }),
  };
}

function createProject(): ProjectData {
  return {
    assets: {
      schemaVersion: 1,
      assets: {
        'model.switch_wall': {
          type: 'model',
          url: '/models/props/switch_wall.glb',
        },
      },
    },
    level: {
      schemaVersion: 1,
      id: 'level_01',
      name: 'Gate Demo',
      environment: {
        ambientLight: 0.35,
        background: '#111111',
      },
      entities: [
        {
          id: 'switch_a',
          prefab: 'switch_wall',
          transform,
          components: {
            Collider: {
              center: [0, 0, 0],
              debugColor: '#f4bd4e',
              isTrigger: true,
              shape: 'aabb',
              size: [2, 2, 2],
            },
          },
        },
      ],
      events: [],
      timelines: [],
      cameraShots: [],
    },
    prefabs: {
      switch_wall: {
        schemaVersion: 1,
        id: 'switch_wall',
        name: 'Wall Switch',
        model: 'model.switch_wall',
        defaultTransform: transform,
        components: {
          Renderable: {
            materials: {
              main: {
                materialId: 'debug.uv-gradient',
                parameters: {
                  strength: 0.5,
                },
              },
            },
            model: 'model.switch_wall',
            renderStyle: {
              highlight: 'selected',
              outline: 'interactable',
              palette: 'world_01',
              profile: 'palette-toon',
              tone: 'accent',
            },
          },
        },
      },
    },
    palettes: {
      world_01: {
        schemaVersion: 1,
        id: 'world_01',
        tones: {
          accent: '#5aa7d6',
          base: '#76b28b',
        },
      },
    },
    events: {},
    timelines: {},
    cameraShots: {},
  };
}
