import * as THREE from 'three';

import type {
  RuntimeRenderStyle,
  RuntimeRenderStyleProfile,
  RuntimeStyleQualityProfile,
  RuntimeStyleResources,
} from '../RuntimeTypes';

const originalMaterialKey = '__sinanOriginalMaterial';

interface StyledMeshUserData {
  [originalMaterialKey]?: THREE.Material | THREE.Material[];
  sinanRenderStyleProfile?: RuntimeRenderStyleProfile;
}

type StyledMesh = THREE.Mesh & {
  userData: THREE.Mesh['userData'] & StyledMeshUserData;
};

export interface ThreeMaterialApplicationResult {
  profile: RuntimeRenderStyleProfile;
  styledMeshCount: number;
  fallbackUsed: boolean;
}

export interface ThreeMaterialRegistryOptions {
  logger?: Pick<Console, 'warn'>;
  resources?: RuntimeStyleResources;
  qualityProfile?: RuntimeStyleQualityProfile;
}

export class ThreeMaterialRegistry {
  private readonly logger: Pick<Console, 'warn'>;
  private resources: RuntimeStyleResources;
  private qualityProfile: RuntimeStyleQualityProfile;

  constructor(options: ThreeMaterialRegistryOptions = {}) {
    this.logger = options.logger ?? console;
    this.resources = options.resources ?? { palettes: {} };
    this.qualityProfile = options.qualityProfile ?? 'standard';
  }

  setStyleResources(resources: RuntimeStyleResources): void {
    this.resources = resources;
  }

  setQualityProfile(profile: RuntimeStyleQualityProfile): void {
    this.qualityProfile = profile;
  }

  applyStyle(
    root: THREE.Object3D,
    style: RuntimeRenderStyle | undefined,
  ): ThreeMaterialApplicationResult {
    const { profile, fallbackUsed } = this.resolveProfile(style);
    let styledMeshCount = 0;

    root.traverse((object) => {
      if (!isStylableMesh(object)) {
        return;
      }

      captureOriginalMaterial(object);
      if (profile === 'standard') {
        restoreOriginalMaterial(object);
      }
      object.userData.sinanRenderStyleProfile = profile;
      styledMeshCount += 1;
    });

    void this.resources;
    void this.qualityProfile;

    return {
      profile,
      styledMeshCount,
      fallbackUsed,
    };
  }

  private resolveProfile(style: RuntimeRenderStyle | undefined): {
    profile: RuntimeRenderStyleProfile;
    fallbackUsed: boolean;
  } {
    const profile = style?.profile ?? 'standard';

    if (profile === 'standard') {
      return { profile, fallbackUsed: false };
    }

    this.logger.warn(
      `Render style profile "${profile}" is not implemented yet; using standard material fallback.`,
    );

    return { profile: 'standard', fallbackUsed: true };
  }
}

function isStylableMesh(object: THREE.Object3D): object is StyledMesh {
  return object instanceof THREE.Mesh;
}

function captureOriginalMaterial(mesh: StyledMesh): void {
  mesh.userData[originalMaterialKey] ??= mesh.material;
}

function restoreOriginalMaterial(mesh: StyledMesh): void {
  const originalMaterial = mesh.userData[originalMaterialKey];

  if (!originalMaterial || mesh.material === originalMaterial) {
    return;
  }

  disposeMaterialSet(mesh.material);
  mesh.material = originalMaterial;
}

function disposeMaterialSet(material: THREE.Material | THREE.Material[]): void {
  const materials = Array.isArray(material) ? material : [material];

  for (const entry of materials) {
    entry.dispose();
  }
}
