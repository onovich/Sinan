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

interface ResolvedMaterialStyle {
  profile: RuntimeRenderStyleProfile;
  fallbackUsed: boolean;
  createMaterial?: () => THREE.Material;
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
    const resolved = this.resolveStyle(style);
    let styledMeshCount = 0;

    root.traverse((object) => {
      if (!isStylableMesh(object)) {
        return;
      }

      captureOriginalMaterial(object);
      if (resolved.profile === 'standard') {
        restoreOriginalMaterial(object);
      } else if (resolved.createMaterial) {
        replaceMaterial(object, resolved.createMaterial());
      }
      object.userData.sinanRenderStyleProfile = resolved.profile;
      styledMeshCount += 1;
    });

    return {
      profile: resolved.profile,
      styledMeshCount,
      fallbackUsed: resolved.fallbackUsed,
    };
  }

  private resolveStyle(style: RuntimeRenderStyle | undefined): ResolvedMaterialStyle {
    const profile = style?.profile ?? 'standard';

    if (profile === 'standard') {
      return { profile, fallbackUsed: false };
    }

    if (profile === 'palette-toon' && style) {
      return this.resolvePaletteToonStyle(style);
    }

    return { profile: 'standard', fallbackUsed: true };
  }

  private resolvePaletteToonStyle(style: RuntimeRenderStyle): ResolvedMaterialStyle {
    const paletteId = style.palette;
    const palette = paletteId ? this.resources.palettes[paletteId] : undefined;

    if (!paletteId || !palette) {
      this.logger.warn(
        `Render style profile "palette-toon" could not find palette "${paletteId ?? 'none'}"; using standard material fallback.`,
      );

      return { profile: 'standard', fallbackUsed: true };
    }

    const tone = style.tone ?? 'base';
    const color = palette.tones[tone];

    if (!color) {
      this.logger.warn(
        `Render style profile "palette-toon" could not find tone "${tone}" in palette "${paletteId}"; using standard material fallback.`,
      );

      return { profile: 'standard', fallbackUsed: true };
    }

    return {
      profile: 'palette-toon',
      fallbackUsed: false,
      createMaterial: () => createPaletteMaterial(color, this.qualityProfile),
    };
  }
}

function createPaletteMaterial(
  color: THREE.ColorRepresentation,
  qualityProfile: RuntimeStyleQualityProfile,
): THREE.Material {
  if (qualityProfile === 'low-end') {
    return new THREE.MeshBasicMaterial({ color });
  }

  return new THREE.MeshToonMaterial({ color });
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

function replaceMaterial(mesh: StyledMesh, nextMaterial: THREE.Material): void {
  const originalMaterial = mesh.userData[originalMaterialKey];

  if (mesh.material !== originalMaterial) {
    disposeMaterialSet(mesh.material);
  }

  mesh.material = nextMaterial;
}

function disposeMaterialSet(material: THREE.Material | THREE.Material[]): void {
  const materials = Array.isArray(material) ? material : [material];

  for (const entry of materials) {
    entry.dispose();
  }
}
