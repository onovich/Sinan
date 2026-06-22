import { describe, expect, it } from 'vitest';

import type { WebRuntime } from '../runtime/WebRuntime';
import type { RuntimeCameraPose, RuntimeTransform } from '../runtime/RuntimeTypes';
import type { CameraShotData } from '../schemas/cameraShot.schema';
import type { LevelData } from '../schemas/level.schema';
import { World } from '../world';
import { DirectorCameraSystem } from './DirectorCameraSystem';
import { createWorldCameraShotResolver } from './WorldCameraShotResolver';

describe('DirectorCameraSystem', () => {
  it('samples a camera shot and applies the pose through WebRuntime', () => {
    const poses: RuntimeCameraPose[] = [];
    const shot: CameraShotData = {
      schemaVersion: 1,
      id: 'cam_gate_reveal',
      type: 'keyframed',
      duration: 2,
      keys: [
        { time: 0, position: [0, 1, 2], lookAt: 'gate_a', fov: 60 },
        { time: 2, position: [2, 3, 4], lookAt: 'gate_a', fov: 40 },
      ],
    };
    const runtime = createRuntimeMock(poses, {
      position: [4, 1, 8],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    });

    const pose = new DirectorCameraSystem(runtime).applyShot(shot, 1);

    expect(pose).toMatchObject({
      position: [1, 2, 3],
      lookAt: [4, 1, 8],
      fov: 50,
    });
    expect(poses).toEqual([pose]);
  });

  it('resolves spherical camera points and entity targets from world-derived transforms', () => {
    const poses: RuntimeCameraPose[] = [];
    const shot: CameraShotData = {
      schemaVersion: 1,
      id: 'cam_spherical_world',
      type: 'lookAt',
      position: {
        mode: 'spherical-region',
        region: 'city',
        localPosition: [0, 0, 0],
      },
      target: 'gate_a',
      fov: 48,
    };
    const world = World.fromLevel(sphericalLevel);
    const runtime = createRuntimeMock(poses, {
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    });

    const pose = new DirectorCameraSystem(runtime, createWorldCameraShotResolver(world)).applyShot(
      shot,
      0,
    );

    expect(pose).toMatchObject({
      fov: 48,
      lookAt: [-10, 0, 0],
      position: [0, 0, 10],
      up: [0, 0, 1],
    });
    expect(poses).toEqual([pose]);
  });
});

const sphericalLevel: LevelData = {
  cameraShots: [],
  entities: [
    {
      components: {},
      id: 'gate_a',
      placement: {
        localPosition: [0, 0, 0],
        mode: 'spherical-region',
        region: 'beach',
      },
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      },
    },
  ],
  events: [],
  id: 'level_spherical',
  name: 'Spherical Level',
  schemaVersion: 1,
  timelines: [],
  worldProjection: {
    radius: 10,
    regions: [
      {
        face: 'front',
        id: 'city',
        label: 'City',
        localBounds: {
          center: [0, 0, 0],
          size: [2, 2, 2],
        },
        name: 'City Region',
      },
      {
        face: 'left',
        id: 'beach',
        label: 'Beach',
        localBounds: {
          center: [0, 0, 0],
          size: [2, 2, 2],
        },
        name: 'Beach Region',
      },
    ],
    type: 'cube-sphere',
  },
};

function createRuntimeMock(poses: RuntimeCameraPose[], transform: RuntimeTransform): WebRuntime {
  return {
    init: () => undefined,
    loadModel: () => Promise.resolve({ assetId: 'mock' }),
    instantiateModel: (_assetId, entityId) => ({ entityId, runtimeObjectId: entityId }),
    createEmpty: (entityId) => ({ entityId, runtimeObjectId: entityId }),
    destroyObject: () => undefined,
    setTransform: () => undefined,
    getTransform: () => transform,
    setVisible: () => undefined,
    playAnimation: () => undefined,
    stopAnimation: () => undefined,
    setAnimationTime: () => undefined,
    setCameraPose: (pose) => {
      poses.push(pose);
    },
    setDebugAabb: () => undefined,
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
