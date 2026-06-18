import * as THREE from 'three';

import type { RuntimeRenderEnvironmentStyle } from '../RuntimeTypes';

const defaultBackground = '#0f1517';
const defaultAmbientLight = 0.35;
const ambientLightIntensityScale = 5;
const defaultFogNear = 8;
const defaultFogFar = 24;

export interface ThreeEnvironmentStyleTargets {
  scene: THREE.Scene;
  renderer: ThreeEnvironmentRenderer;
  ambientLight?: THREE.Light;
  helperRoots?: Iterable<THREE.Object3D | undefined>;
}

export interface ThreeEnvironmentRenderer {
  domElement?: {
    style?: {
      filter: string;
    };
  };
  setClearColor(color: THREE.ColorRepresentation, alpha?: number): void;
  toneMappingExposure: number;
}

export function applyThreeEnvironmentStyle(
  targets: ThreeEnvironmentStyleTargets,
  environment: RuntimeRenderEnvironmentStyle | undefined,
): void {
  const background = environment?.background ?? defaultBackground;
  targets.scene.background = new THREE.Color(background);
  targets.renderer.setClearColor(background, 1);

  if (targets.ambientLight) {
    targets.ambientLight.intensity =
      (environment?.ambientLight ?? defaultAmbientLight) * ambientLightIntensityScale;
  }

  const fog = environment?.fog;
  targets.scene.fog =
    fog?.enabled === true
      ? new THREE.Fog(fog.color ?? background, fog.near ?? defaultFogNear, fog.far ?? defaultFogFar)
      : null;

  applyColorGrade(targets.renderer, environment?.colorGrade);
  keepHelpersReadable(targets.helperRoots);
}

function applyColorGrade(
  renderer: ThreeEnvironmentRenderer,
  colorGrade: RuntimeRenderEnvironmentStyle['colorGrade'],
): void {
  if (colorGrade?.enabled !== true) {
    renderer.toneMappingExposure = 1;
    if (renderer.domElement?.style) {
      renderer.domElement.style.filter = '';
    }
    return;
  }

  const exposure = colorGrade.exposure ?? 1;
  const saturation = colorGrade.saturation ?? 1;
  renderer.toneMappingExposure = exposure;

  if (renderer.domElement?.style) {
    renderer.domElement.style.filter = [
      exposure === 1 ? undefined : `brightness(${formatFilterNumber(exposure)})`,
      saturation === 1 ? undefined : `saturate(${formatFilterNumber(saturation)})`,
    ]
      .filter((value) => value !== undefined)
      .join(' ');
  }
}

function keepHelpersReadable(helperRoots: Iterable<THREE.Object3D | undefined> | undefined): void {
  if (!helperRoots) {
    return;
  }

  for (const root of helperRoots) {
    root?.traverse((object) => {
      disableFogForMaterial(object);
    });
  }
}

function disableFogForMaterial(object: THREE.Object3D): void {
  const material = (object as THREE.Mesh | THREE.LineSegments).material;
  if (!material) {
    return;
  }

  for (const entry of Array.isArray(material) ? material : [material]) {
    (entry as THREE.Material & { fog?: boolean }).fog = false;
  }
}

function formatFilterNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '');
}
