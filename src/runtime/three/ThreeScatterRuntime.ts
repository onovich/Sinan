import * as THREE from 'three';

import { generateScatterInstances } from '../ScatterGenerator';
import type {
  RuntimeScatterDiagnostics,
  RuntimeScatterGroup,
  RuntimeScatterInstance,
  RuntimeStyleQualityProfile,
} from '../RuntimeTypes';
import type { ThreeAssetLoader, ThreeLoadedModelAsset } from './ThreeAssetLoader';
import { disposeObjectResources } from './ThreeObjectResources';

interface ThreeScatterRuntimeOptions {
  modelAssets: ThreeAssetLoader;
}

interface ScatterMeshBinding {
  mesh: THREE.InstancedMesh;
  diagnostics: RuntimeScatterDiagnostics;
}

type MaterialMesh = THREE.Mesh & {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
};

export class ThreeScatterRuntime {
  private readonly modelAssets: ThreeAssetLoader;
  private root: THREE.Object3D | undefined;
  private groups: RuntimeScatterGroup[] = [];
  private qualityProfile: RuntimeStyleQualityProfile = 'standard';
  private readonly meshByGroupId = new Map<string, ScatterMeshBinding>();
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly rotation = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();

  constructor(options: ThreeScatterRuntimeOptions) {
    this.modelAssets = options.modelAssets;
  }

  setRoot(root: THREE.Object3D | undefined): void {
    this.root = root;

    if (!root) {
      return;
    }

    for (const binding of this.meshByGroupId.values()) {
      if (!binding.mesh.parent) {
        root.add(binding.mesh);
      }
    }
  }

  setQualityProfile(profile: RuntimeStyleQualityProfile): void {
    this.qualityProfile = profile;
    this.rebuild();
  }

  setGroups(groups: readonly RuntimeScatterGroup[]): void {
    this.groups = [...groups];
    this.rebuild();
  }

  getDiagnostics(): readonly RuntimeScatterDiagnostics[] {
    return Array.from(this.meshByGroupId.values(), (binding) => binding.diagnostics);
  }

  dispose(): void {
    for (const binding of this.meshByGroupId.values()) {
      binding.mesh.removeFromParent();
      disposeObjectResources(binding.mesh);
    }

    this.meshByGroupId.clear();
  }

  private rebuild(): void {
    this.dispose();

    for (const group of this.groups) {
      const instances = generateScatterInstances(group, {
        qualityProfile: this.qualityProfile,
      });

      if (instances.length === 0) {
        continue;
      }

      const source = this.resolveSource(group);
      const mesh = this.createInstancedMesh(source.asset, source.loadedAsset, instances);
      mesh.name = `scatter:${group.id}`;
      mesh.userData = {
        scatterGroupId: group.id,
        assetId: source.asset,
        fallbackUsed: source.fallbackUsed,
      };
      this.root?.add(mesh);
      this.meshByGroupId.set(group.id, {
        mesh,
        diagnostics: {
          groupId: group.id,
          instanceCount: instances.length,
          sourceAsset: source.asset,
          fallbackUsed: source.fallbackUsed,
        },
      });
    }
  }

  private resolveSource(group: RuntimeScatterGroup): {
    asset: string;
    fallbackUsed: boolean;
    loadedAsset: ThreeLoadedModelAsset | undefined;
  } {
    const sourceAsset = group.source.type === 'asset' ? group.source.asset : undefined;
    const loadedSource = sourceAsset ? this.modelAssets.getLoadedModel(sourceAsset) : undefined;

    if (sourceAsset && loadedSource) {
      return {
        asset: sourceAsset,
        fallbackUsed: false,
        loadedAsset: loadedSource,
      };
    }

    const fallbackAsset = group.fallback?.asset ?? sourceAsset ?? `scatter.${group.id}.placeholder`;
    const loadedFallback = this.modelAssets.getLoadedModel(fallbackAsset);

    return {
      asset: fallbackAsset,
      fallbackUsed: true,
      loadedAsset: loadedFallback,
    };
  }

  private createInstancedMesh(
    assetId: string,
    loadedAsset: ThreeLoadedModelAsset | undefined,
    instances: readonly RuntimeScatterInstance[],
  ): THREE.InstancedMesh {
    const renderable = loadedAsset ? getFirstMaterialMesh(loadedAsset.scene) : undefined;
    const geometry = renderable?.geometry.clone() ?? new THREE.BoxGeometry(0.24, 0.24, 0.08);
    const material = cloneFirstMaterial(renderable?.material, assetId);
    const mesh = new THREE.InstancedMesh(geometry, material, instances.length);

    instances.forEach((instance, index) => {
      this.position.set(...instance.transform.position);
      this.rotation.set(...instance.transform.rotation);
      this.scale.set(...instance.transform.scale);
      this.matrix.compose(this.position, this.rotation, this.scale);
      mesh.setMatrixAt(index, this.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;

    return mesh;
  }
}

function getFirstMaterialMesh(root: THREE.Object3D): MaterialMesh | undefined {
  let mesh: MaterialMesh | undefined;

  root.traverse((object) => {
    if (!mesh && object instanceof THREE.Mesh) {
      mesh = object as MaterialMesh;
    }
  });

  return mesh;
}

function cloneFirstMaterial(
  material: THREE.Material | THREE.Material[] | undefined,
  assetId: string,
): THREE.Material {
  if (Array.isArray(material)) {
    return material[0]?.clone() ?? createPlaceholderMaterial(assetId);
  }

  return material?.clone() ?? createPlaceholderMaterial(assetId);
}

function createPlaceholderMaterial(assetId: string): THREE.Material {
  return new THREE.MeshStandardMaterial({
    color: assetId.includes('switch') ? 0x5aa7d6 : 0x76b28b,
    roughness: 0.5,
  });
}
