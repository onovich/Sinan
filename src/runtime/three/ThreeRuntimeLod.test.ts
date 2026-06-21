import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import { DEBUG_UV_GRADIENT_MATERIAL_ID } from '../materials';
import type { RuntimeLodGroup } from '../RuntimeTypes';
import {
  ThreeAssetLoader,
  type ThreeModelLoader,
  type ThreeModelLoadResult,
} from './ThreeAssetLoader';
import { ThreeRuntime } from './ThreeRuntime';

const lodGroup: RuntimeLodGroup = {
  strategy: 'distance',
  hysteresis: 1,
  lowEndBias: 1,
  fallbackAsset: 'model.switch_wall.lod2',
  levels: [
    { level: 0, asset: 'model.switch_wall.lod0', minDistance: 0 },
    { level: 1, asset: 'model.switch_wall.lod1', minDistance: 8 },
    { level: 2, asset: 'model.switch_wall.lod2', minDistance: 16 },
  ],
};

describe('ThreeRuntime LOD switching', () => {
  it('switches to a loaded LOD level and preserves transform and explicit materials', async () => {
    const runtime = createRuntime();

    await loadLodModels(runtime);
    runtime.instantiateModel('model.switch_wall.lod0', 'switch_a');
    runtime.setTransform('switch_a', {
      position: [2, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    });
    runtime.setRenderableMaterials('switch_a', {
      main: {
        materialId: DEBUG_UV_GRADIENT_MATERIAL_ID,
        parameters: {
          strength: 0.5,
        },
      },
    });
    setRuntimeCamera(runtime, [2, 0, 9]);

    runtime.setEntityLodGroup('switch_a', lodGroup);

    expect(getRuntimeAssetId(runtime, 'switch_a')).toBe('model.switch_wall.lod1');
    expect(runtime.getTransform('switch_a')).toEqual({
      position: [2, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    });
    expect(getFirstMesh(runtime, 'switch_a').material).toBeInstanceOf(THREE.ShaderMaterial);
  });

  it('keeps hysteresis around switching thresholds', async () => {
    const runtime = createRuntime();

    await loadLodModels(runtime);
    runtime.instantiateModel('model.switch_wall.lod0', 'switch_a');
    setRuntimeCamera(runtime, [0, 0, 8.5]);
    runtime.setEntityLodGroup('switch_a', lodGroup);

    expect(getRuntimeAssetId(runtime, 'switch_a')).toBe('model.switch_wall.lod0');

    setRuntimeCamera(runtime, [0, 0, 9]);
    runtime.update(0);

    expect(getRuntimeAssetId(runtime, 'switch_a')).toBe('model.switch_wall.lod1');
  });

  it('uses the fallback placeholder when the selected LOD asset is not loaded', async () => {
    const runtime = createRuntime();

    await runtime.loadModel('model.switch_wall.lod0', '/models/props/switch_wall_lod0.glb');
    runtime.instantiateModel('model.switch_wall.lod0', 'switch_a');
    setRuntimeCamera(runtime, [0, 0, 9]);
    runtime.setEntityLodGroup('switch_a', lodGroup);

    expect(getRuntimeAssetId(runtime, 'switch_a')).toBe('model.switch_wall.lod2');
    expect(getFirstMesh(runtime, 'switch_a')).toBeInstanceOf(THREE.Mesh);
  });

  it('disposes replaced LOD clone resources', async () => {
    const runtime = createRuntime();
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose');

    try {
      await loadLodModels(runtime);
      runtime.instantiateModel('model.switch_wall.lod0', 'switch_a');
      setRuntimeCamera(runtime, [0, 0, 9]);
      runtime.setEntityLodGroup('switch_a', lodGroup);

      expect(geometryDispose).toHaveBeenCalled();
      expect(materialDispose).toHaveBeenCalled();
    } finally {
      runtime.dispose();
      geometryDispose.mockRestore();
      materialDispose.mockRestore();
    }
  });
});

class FakeModelLoader implements ThreeModelLoader {
  load(url: string): Promise<ThreeModelLoadResult> {
    return Promise.resolve(createLoadResult(url));
  }
}

function createRuntime(): ThreeRuntime {
  return new ThreeRuntime({
    modelAssets: new ThreeAssetLoader(new FakeModelLoader()),
  });
}

async function loadLodModels(runtime: ThreeRuntime): Promise<void> {
  await Promise.all([
    runtime.loadModel('model.switch_wall.lod0', '/models/props/switch_wall_lod0.glb'),
    runtime.loadModel('model.switch_wall.lod1', '/models/props/switch_wall_lod1.glb'),
    runtime.loadModel('model.switch_wall.lod2', '/models/props/switch_wall_lod2.glb'),
  ]);
}

function createLoadResult(url: string): ThreeModelLoadResult {
  const scene = new THREE.Group();
  const color = url.includes('lod2') ? 0x76b28b : url.includes('lod1') ? 0x5aa7d6 : 0x9f7b52;

  scene.add(
    new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color })),
  );

  return { scene, animations: [] };
}

function setRuntimeCamera(
  runtime: ThreeRuntime,
  position: readonly [number, number, number],
): void {
  (
    runtime as unknown as {
      camera: THREE.PerspectiveCamera;
    }
  ).camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  (
    runtime as unknown as {
      camera: THREE.PerspectiveCamera;
    }
  ).camera.position.set(...position);
}

function getRuntimeAssetId(runtime: ThreeRuntime, entityId: string): string | undefined {
  return getRuntimeObject(runtime, entityId).userData.assetId as string | undefined;
}

function getFirstMesh(runtime: ThreeRuntime, entityId: string): THREE.Mesh {
  const object = getRuntimeObject(runtime, entityId);
  let mesh: THREE.Mesh | undefined;

  object.traverse((child) => {
    if (!mesh && child instanceof THREE.Mesh) {
      mesh = child;
    }
  });

  if (!mesh) {
    throw new Error(`Missing mesh for runtime object "${entityId}".`);
  }

  return mesh;
}

function getRuntimeObject(runtime: ThreeRuntime, entityId: string): THREE.Object3D {
  const objectByEntityId = (
    runtime as unknown as {
      objectByEntityId: Map<string, THREE.Object3D>;
    }
  ).objectByEntityId;
  const object = objectByEntityId.get(entityId);

  if (!object) {
    throw new Error(`Missing runtime object "${entityId}".`);
  }

  return object;
}
