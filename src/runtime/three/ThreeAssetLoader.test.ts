import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  cloneLoadedModelScene,
  GltfThreeModelLoader,
  ThreeAssetLoader,
  type ThreeModelLoader,
  type ThreeModelLoadResult,
} from './ThreeAssetLoader';

describe('ThreeAssetLoader', () => {
  it('keeps GLTF compression hooks optional by default', () => {
    const loader = new GltfThreeModelLoader();

    expect(loader.compressionStatus).toMatchObject({
      draco: 'not-configured',
      meshopt: 'not-configured',
      ktx2: 'not-configured',
    });
  });

  it('loads a GLB model once and returns cached loaded state', async () => {
    const loadResult = createLoadResult('DoorRoot', [new THREE.AnimationClip('Open', 1, [])]);
    const loader = new FakeModelLoader(() => Promise.resolve(loadResult));
    const assets = new ThreeAssetLoader(loader);

    const pending = assets.loadModel('model.door_wood', '/models/props/door_wood.glb');

    expect(assets.getModelState('model.door_wood')).toMatchObject({
      status: 'loading',
      url: '/models/props/door_wood.glb',
    });

    const loaded = await pending;
    const loadedAgain = await assets.loadModel('model.door_wood', '/models/props/door_wood.glb');

    expect(loader.urls).toEqual(['/models/props/door_wood.glb']);
    expect(loadedAgain).toBe(loaded);
    expect(assets.getLoadedModel('model.door_wood')).toBe(loaded);
    expect(assets.getModelState('model.door_wood')).toMatchObject({
      status: 'loaded',
      assetId: 'model.door_wood',
    });
  });

  it('records failed state so runtime callers can keep placeholder fallback', async () => {
    const loader = new FakeModelLoader(() => Promise.reject(new Error('404 missing asset')));
    const assets = new ThreeAssetLoader(loader);

    await expect(assets.loadModel('model.missing', '/models/missing.glb')).rejects.toThrow(
      'Failed to load GLB asset "model.missing" from "/models/missing.glb": 404 missing asset',
    );

    expect(assets.getLoadedModel('model.missing')).toBeUndefined();
    expect(assets.getModelState('model.missing')).toMatchObject({
      status: 'failed',
      assetId: 'model.missing',
      url: '/models/missing.glb',
    });
  });

  it('deep-clones render resources for safe per-instance disposal', () => {
    const loaded = {
      assetId: 'model.box',
      url: '/models/box.glb',
      ...createLoadResult('BoxRoot', []),
    };
    const originalMesh = findFirstMesh(loaded.scene);

    const clone = cloneLoadedModelScene(loaded);
    const clonedMesh = findFirstMesh(clone);

    expect(clone).not.toBe(loaded.scene);
    expect(clonedMesh).not.toBe(originalMesh);
    expect(clonedMesh.geometry).not.toBe(originalMesh.geometry);
    expect(clonedMesh.material).not.toBe(originalMesh.material);
  });
});

class FakeModelLoader implements ThreeModelLoader {
  readonly urls: string[] = [];

  constructor(
    private readonly loadImplementation: (url: string) => Promise<ThreeModelLoadResult>,
  ) {}

  load(url: string): Promise<ThreeModelLoadResult> {
    this.urls.push(url);

    return this.loadImplementation(url);
  }
}

function createLoadResult(
  rootName: string,
  animations: THREE.AnimationClip[],
): ThreeModelLoadResult {
  const scene = new THREE.Group();
  scene.name = rootName;
  scene.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x76b28b }),
    ),
  );

  return { scene, animations };
}

function findFirstMesh(root: THREE.Object3D): THREE.Mesh {
  let mesh: THREE.Mesh | undefined;
  root.traverse((object) => {
    if (!mesh && object instanceof THREE.Mesh) {
      mesh = object;
    }
  });

  if (!mesh) {
    throw new Error('Expected a mesh in the object tree.');
  }

  return mesh;
}
