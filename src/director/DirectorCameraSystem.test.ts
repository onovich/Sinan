import { describe, expect, it } from 'vitest';

import type { WebRuntime } from '../runtime/WebRuntime';
import type { RuntimeCameraPose, RuntimeTransform } from '../runtime/RuntimeTypes';
import type { CameraShotData } from '../schemas/cameraShot.schema';
import { DirectorCameraSystem } from './DirectorCameraSystem';

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
});

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
