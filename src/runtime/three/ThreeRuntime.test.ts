import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import {
  ThreeAssetLoader,
  type ThreeModelLoader,
  type ThreeModelLoadResult,
} from './ThreeAssetLoader';
import { ThreeRuntime } from './ThreeRuntime';

describe('ThreeRuntime asset-backed models', () => {
  it('keeps placeholder instantiation available when GLB loading fails', async () => {
    const warnings: string[] = [];
    const runtime = new ThreeRuntime({
      modelAssets: new ThreeAssetLoader(
        new FakeModelLoader(() => Promise.reject(new Error('network failed'))),
      ),
      logger: {
        warn: (message: unknown) => {
          warnings.push(String(message));
        },
      },
    });

    await expect(runtime.loadModel('model.missing', '/models/missing.glb')).resolves.toEqual({
      assetId: 'model.missing',
    });
    const handle = runtime.instantiateModel('model.missing', 'missing_entity');

    expect(handle).toEqual({
      entityId: 'missing_entity',
      runtimeObjectId: 'missing_entity',
    });
    expect(runtime.getTransform('missing_entity')).toEqual({
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    });
    expect(warnings).toEqual([
      'GLB asset "model.missing" failed to load from "/models/missing.glb"; using placeholder fallback.',
    ]);
  });

  it('routes scrubbed animation time through a loaded AnimationMixer clip', async () => {
    const runtime = new ThreeRuntime({
      modelAssets: new ThreeAssetLoader(
        new FakeModelLoader(() => Promise.resolve(createAnimatedLoadResult())),
      ),
    });

    await runtime.loadModel('model.animated', '/models/animated.glb');
    runtime.instantiateModel('model.animated', 'animated_entity');
    runtime.setAnimationTime({
      entityId: 'animated_entity',
      clip: 'Slide',
      time: 0.5,
    });

    expect(runtime.getTransform('animated_entity')?.position[0]).toBeCloseTo(1);
  });

  it('disposes replaced objects, destroyed objects, and cached model resources', async () => {
    const runtime = new ThreeRuntime({
      modelAssets: new ThreeAssetLoader(
        new FakeModelLoader(() => Promise.resolve(createAnimatedLoadResult())),
      ),
    });
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose');

    try {
      await runtime.loadModel('model.animated', '/models/animated.glb');

      runtime.instantiateModel('model.animated', 'animated_entity');
      runtime.playAnimation({
        entityId: 'animated_entity',
        clip: 'Slide',
      });
      runtime.instantiateModel('model.animated', 'animated_entity');

      expect(geometryDispose).toHaveBeenCalled();
      expect(materialDispose).toHaveBeenCalled();
      expect(runtime.getTransform('animated_entity')).not.toBeNull();

      geometryDispose.mockClear();
      materialDispose.mockClear();

      runtime.destroyObject('animated_entity');

      expect(runtime.getTransform('animated_entity')).toBeNull();
      expect(geometryDispose).toHaveBeenCalled();
      expect(materialDispose).toHaveBeenCalled();

      geometryDispose.mockClear();
      materialDispose.mockClear();

      runtime.dispose();

      expect(geometryDispose).toHaveBeenCalled();
      expect(materialDispose).toHaveBeenCalled();
      expect(() => {
        runtime.update(1);
        runtime.render();
        runtime.resize({ width: 64, height: 64, pixelRatio: 1 });
        runtime.destroyObject('animated_entity');
        runtime.dispose();
      }).not.toThrow();
    } finally {
      runtime.dispose();
      geometryDispose.mockRestore();
      materialDispose.mockRestore();
    }
  });
});

class FakeModelLoader implements ThreeModelLoader {
  constructor(
    private readonly loadImplementation: (url: string) => Promise<ThreeModelLoadResult>,
  ) {}

  load(url: string): Promise<ThreeModelLoadResult> {
    return this.loadImplementation(url);
  }
}

function createAnimatedLoadResult(): ThreeModelLoadResult {
  const scene = new THREE.Group();
  scene.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x76b28b }),
    ),
  );

  return {
    scene,
    animations: [
      new THREE.AnimationClip('Slide', 1, [
        new THREE.VectorKeyframeTrack('.position', [0, 1], [0, 0, 0, 2, 0, 0]),
      ]),
    ],
  };
}
