import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

import {
  configureCompressedGltfLoader,
  type CompressionCapableGltfLoader,
  type ThreeCompressedAssetLoaderStatus,
  type ThreeGltfCompressionConfig,
} from './ThreeCompressedAssetLoader';
import { cloneRenderableResources, disposeObjectTree } from './ThreeObjectResources';

export interface ThreeLoadedModelAsset {
  assetId: string;
  url: string;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

export interface ThreeModelLoadResult {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

export interface ThreeModelLoader {
  load(url: string): Promise<ThreeModelLoadResult>;
}

export type ThreeModelAssetState =
  | {
      status: 'loading';
      assetId: string;
      url: string;
      promise: Promise<ThreeLoadedModelAsset>;
    }
  | {
      status: 'loaded';
      assetId: string;
      url: string;
      asset: ThreeLoadedModelAsset;
    }
  | {
      status: 'failed';
      assetId: string;
      url: string;
      error: Error;
    };

export class GltfThreeModelLoader implements ThreeModelLoader {
  private readonly loader: GLTFLoader;
  readonly compressionStatus: ThreeCompressedAssetLoaderStatus;

  constructor(loader = new GLTFLoader(), compressionConfig: ThreeGltfCompressionConfig = {}) {
    this.loader = loader;
    this.compressionStatus = configureCompressedGltfLoader(
      loader as unknown as CompressionCapableGltfLoader,
      compressionConfig,
    );
  }

  async load(url: string): Promise<ThreeModelLoadResult> {
    const gltf = await this.loader.loadAsync(url);

    return toModelLoadResult(gltf);
  }
}

export class ThreeAssetLoader {
  private readonly entries = new Map<string, ThreeModelAssetState>();

  constructor(private readonly modelLoader: ThreeModelLoader = new GltfThreeModelLoader()) {}

  loadModel(assetId: string, url: string): Promise<ThreeLoadedModelAsset> {
    const current = this.entries.get(assetId);

    if (current && current.url === url) {
      if (current.status === 'loading') {
        return current.promise;
      }

      if (current.status === 'loaded') {
        return Promise.resolve(current.asset);
      }

      return Promise.reject(current.error);
    }

    if (current?.status === 'loaded') {
      disposeObjectTree(current.asset.scene);
    }

    const promise = this.modelLoader
      .load(url)
      .then((result) => {
        const asset: ThreeLoadedModelAsset = {
          assetId,
          url,
          scene: result.scene,
          animations: result.animations,
        };
        this.entries.set(assetId, {
          status: 'loaded',
          assetId,
          url,
          asset,
        });

        return asset;
      })
      .catch((error: unknown) => {
        const loadError = toModelLoadError(assetId, url, error);
        this.entries.set(assetId, {
          status: 'failed',
          assetId,
          url,
          error: loadError,
        });

        throw loadError;
      });

    this.entries.set(assetId, {
      status: 'loading',
      assetId,
      url,
      promise,
    });

    return promise;
  }

  getModelState(assetId: string): ThreeModelAssetState | undefined {
    return this.entries.get(assetId);
  }

  getLoadedModel(assetId: string): ThreeLoadedModelAsset | undefined {
    const state = this.entries.get(assetId);

    return state?.status === 'loaded' ? state.asset : undefined;
  }

  dispose(): void {
    for (const state of this.entries.values()) {
      if (state.status === 'loaded') {
        disposeObjectTree(state.asset.scene);
      }
    }

    this.entries.clear();
  }
}

export function cloneLoadedModelScene(asset: ThreeLoadedModelAsset): THREE.Object3D {
  const clone = cloneSkeleton(asset.scene);
  cloneRenderableResources(clone);
  clone.name = asset.scene.name || asset.assetId;

  return clone;
}

function toModelLoadResult(gltf: GLTF): ThreeModelLoadResult {
  return {
    scene: gltf.scene,
    animations: gltf.animations,
  };
}

function toModelLoadError(assetId: string, url: string, error: unknown): Error {
  const detail = getErrorMessage(error);

  return new Error(`Failed to load GLB asset "${assetId}" from "${url}": ${detail}`, {
    cause: error,
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
