import * as THREE from 'three';

export const FALLBACK_MATERIAL_NAME = 'material:fallback-error';

export function createFallbackMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    name: FALLBACK_MATERIAL_NAME,
    color: 0xff00ff,
  });
}
