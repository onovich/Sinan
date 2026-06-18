import { describe, expect, it } from 'vitest';

import type { ProjectData } from '../data/DataRepository';
import type { RuntimeRenderStyle, RuntimeStyleResources } from '../runtime/RuntimeTypes';
import type { WebRuntime } from '../runtime/WebRuntime';
import type { TransformData } from '../schemas/transform.schema';
import { loadProjectIntoRuntime } from './Viewport';

const transform: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

describe('Viewport runtime style flow', () => {
  it('passes palette resources, environment, and render styles through WebRuntime', async () => {
    const calls: unknown[] = [];
    const project: ProjectData = {
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
            transform,
            components: {},
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
              model: 'model.switch_wall',
              renderStyle: {
                profile: 'palette-toon',
                palette: 'world_01',
                tone: 'accent',
                outline: 'interactable',
                highlight: 'selected',
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
            base: '#76b28b',
            accent: '#5aa7d6',
          },
        },
      },
      events: {},
      timelines: {},
      cameraShots: {},
    };

    await loadProjectIntoRuntime(createRuntimeMock(calls), project, () => false);

    expect(calls).toEqual([
      {
        type: 'styleResources',
        resources: {
          palettes: {
            world_01: {
              id: 'world_01',
              tones: {
                base: '#76b28b',
                accent: '#5aa7d6',
              },
            },
          },
        },
      },
      {
        type: 'environment',
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
      },
      { type: 'loadModel', assetId: 'model.switch_wall', url: '/models/props/switch_wall.glb' },
      { type: 'instantiateModel', assetId: 'model.switch_wall', entityId: 'switch_a' },
      { type: 'setTransform', entityId: 'switch_a' },
      {
        type: 'setRenderStyle',
        entityId: 'switch_a',
        style: {
          profile: 'palette-toon',
          palette: 'world_01',
          tone: 'accent',
          outline: 'interactable',
          highlight: 'selected',
        },
      },
    ]);
  });
});

function createRuntimeMock(calls: unknown[]): WebRuntime {
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
    createEmpty: (entityId) => ({ entityId, runtimeObjectId: entityId }),
    destroyObject: () => undefined,
    setTransform: (entityId) => {
      calls.push({ type: 'setTransform', entityId });
    },
    getTransform: () => null,
    setVisible: () => undefined,
    playAnimation: () => undefined,
    stopAnimation: () => undefined,
    setAnimationTime: () => undefined,
    setCameraPose: () => undefined,
    setDebugAabb: () => undefined,
    setStyleResources: (resources: RuntimeStyleResources) => {
      calls.push({ type: 'styleResources', resources });
    },
    setRenderEnvironment: (environment) => {
      calls.push({ type: 'environment', environment });
    },
    setRenderStyle: (entityId: string, style: RuntimeRenderStyle | undefined) => {
      calls.push({ type: 'setRenderStyle', entityId, style });
    },
    pick: () => null,
    attachTransformGizmo: () => undefined,
    detachTransformGizmo: () => undefined,
    setTransformGizmoMode: () => undefined,
    update: () => undefined,
    render: () => undefined,
    resize: () => undefined,
    dispose: () => undefined,
  };
}
