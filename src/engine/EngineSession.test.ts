import { describe, expect, it } from 'vitest';

import type { ProjectData } from '../data/DataRepository';
import type {
  RuntimeDebugAabb,
  RuntimeLodGroup,
  RuntimeRenderStyle,
  RuntimeRenderableMaterialSlots,
  RuntimeScatterGroup,
  RuntimeShaderGlobals,
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

  it('routes shader globals from frame steps and resize through the runtime', () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      maxFrameDeltaSeconds: 0.1,
      runtime: createRuntimeProbe(calls, { recordShaderGlobals: true }),
    });

    session.resize({ height: 600, pixelRatio: 2, width: 800 });
    session.step(0.016);
    session.step(0.25);

    expect(calls[0]).toEqual({
      type: 'resize',
      size: { height: 600, pixelRatio: 2, width: 800 },
    });
    expect(calls[1]).toEqual({
      type: 'setShaderGlobals',
      globals: {
        elapsedSeconds: 0,
        deltaSeconds: 0,
        viewportSize: [800, 600],
      },
    });
    expect(calls[2]).toEqual({
      type: 'setShaderGlobals',
      globals: {
        elapsedSeconds: 0.016,
        deltaSeconds: 0.016,
        viewportSize: [800, 600],
      },
    });
    expect(calls[3]).toEqual({ type: 'update', deltaSeconds: 0.016 });
    expect(calls[4]).toEqual({ type: 'render' });
    expect(calls[5]).toMatchObject({
      type: 'setShaderGlobals',
      globals: {
        deltaSeconds: 0.1,
        viewportSize: [800, 600],
      },
    });
    expect((calls[5] as { globals: RuntimeShaderGlobals }).globals.elapsedSeconds).toBeCloseTo(
      0.116,
    );
    expect(calls[6]).toEqual({ type: 'update', deltaSeconds: 0.1 });
    expect(calls[7]).toEqual({ type: 'render' });
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

  it('passes manifest LOD groups to runtime entities without renderer details', async () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      runtime: createRuntimeProbe(calls, { recordLodGroups: true }),
    });

    await session.loadProject(createLodProject());

    expect(calls).toContainEqual({
      type: 'setEntityLodGroup',
      entityId: 'switch_a',
      group: {
        strategy: 'distance',
        hysteresis: 1,
        lowEndBias: 1,
        fallbackAsset: 'model.switch_wall.lod2',
        levels: [
          { level: 0, asset: 'model.switch_wall.lod0', minDistance: 0 },
          { level: 1, asset: 'model.switch_wall.lod1', minDistance: 8 },
          { level: 2, asset: 'model.switch_wall.lod2', minDistance: 16 },
        ],
      },
    });
  });

  it('passes level scatter groups to the runtime after project load', async () => {
    const calls: unknown[] = [];
    const session = new EngineSession({
      runtime: createRuntimeProbe(calls, { recordScatterGroups: true }),
    });

    await session.loadProject(createScatterProject());

    expect(calls).toContainEqual({
      type: 'setScatterGroups',
      groups: [
        {
          id: 'scatter_switch_markers',
          source: {
            type: 'asset',
            asset: 'model.switch_wall.lod2',
          },
          count: 6,
          seed: 'gate-demo-switch-markers',
          placement: {
            shape: 'box',
            center: [1.2, 0.7, 6.2],
            size: [2.4, 0, 1.6],
          },
          alignment: 'y-up',
          transform: {
            uniformScale: {
              min: 0.55,
              max: 0.85,
            },
          },
          quality: {
            lowEndCountScale: 0.5,
          },
          fallback: {
            mode: 'placeholder',
            asset: 'model.switch_wall.lod2',
          },
        },
      ],
    });
  });
});

function createRuntimeProbe(
  calls: unknown[],
  options: {
    recordLodGroups?: boolean;
    recordScatterGroups?: boolean;
    recordShaderGlobals?: boolean;
  } = {},
): WebRuntime {
  const runtime: WebRuntime = {
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

  if (options.recordShaderGlobals) {
    runtime.setShaderGlobals = (globals) => {
      calls.push({ type: 'setShaderGlobals', globals });
    };
  }
  if (options.recordLodGroups) {
    runtime.setEntityLodGroup = (entityId: string, group: RuntimeLodGroup | undefined) => {
      calls.push({ type: 'setEntityLodGroup', entityId, group });
    };
  }
  if (options.recordScatterGroups) {
    runtime.setScatterGroups = (groups: readonly RuntimeScatterGroup[]) => {
      calls.push({ type: 'setScatterGroups', groups });
    };
  }

  return runtime;
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

function createLodProject(): ProjectData {
  const project = createProject();

  return {
    ...project,
    assets: {
      schemaVersion: 1,
      assets: {
        'model.switch_wall': {
          type: 'model',
          url: '/models/props/switch_wall.glb',
          metadata: {
            lodGroup: 'gate-demo-props',
          },
        },
        'model.switch_wall.lod0': {
          type: 'model',
          url: '/models/props/switch_wall_lod0.glb',
        },
        'model.switch_wall.lod1': {
          type: 'model',
          url: '/models/props/switch_wall_lod1.glb',
        },
        'model.switch_wall.lod2': {
          type: 'model',
          url: '/models/props/switch_wall_lod2.glb',
        },
      },
      lodGroups: {
        'gate-demo-props': {
          strategy: 'distance',
          hysteresis: 1,
          lowEndBias: 1,
          fallbackAsset: 'model.switch_wall.lod2',
          levels: [
            { level: 0, asset: 'model.switch_wall.lod0', minDistance: 0 },
            { level: 1, asset: 'model.switch_wall.lod1', minDistance: 8 },
            { level: 2, asset: 'model.switch_wall.lod2', minDistance: 16 },
          ],
        },
      },
    },
  };
}

function createScatterProject(): ProjectData {
  const project = createProject();

  return {
    ...project,
    assets: {
      schemaVersion: 1,
      assets: {
        ...project.assets.assets,
        'model.switch_wall.lod2': {
          type: 'model',
          url: '/models/props/switch_wall_lod2.glb',
        },
      },
    },
    level: {
      ...project.level,
      scatterGroups: [
        {
          id: 'scatter_switch_markers',
          source: {
            type: 'asset',
            asset: 'model.switch_wall.lod2',
          },
          count: 6,
          seed: 'gate-demo-switch-markers',
          placement: {
            shape: 'box',
            center: [1.2, 0.7, 6.2],
            size: [2.4, 0, 1.6],
          },
          alignment: 'y-up',
          transform: {
            uniformScale: {
              min: 0.55,
              max: 0.85,
            },
          },
          quality: {
            lowEndCountScale: 0.5,
          },
          fallback: {
            mode: 'placeholder',
            asset: 'model.switch_wall.lod2',
          },
        },
      ],
    },
  };
}
