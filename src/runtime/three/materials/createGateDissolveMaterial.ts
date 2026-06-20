import * as THREE from 'three';

import { gateDissolveShaders } from '../../../shaders/materials/story/gateDissolveShaders';

export interface GateDissolveMaterialOptions {
  progress: number;
  edgeWidth: number;
  edgeColor: string;
  baseColor: string;
  noiseScale: number;
}

export function createGateDissolveMaterial(
  options: GateDissolveMaterialOptions,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'material:story.gate-dissolve',
    vertexShader: gateDissolveShaders.vertexShader,
    fragmentShader: gateDissolveShaders.fragmentShader,
    uniforms: {
      uProgress: { value: options.progress },
      uEdgeWidth: { value: options.edgeWidth },
      uEdgeColor: { value: new THREE.Color(options.edgeColor) },
      uBaseColor: { value: new THREE.Color(options.baseColor) },
      uNoiseScale: { value: options.noiseScale },
    },
    side: THREE.DoubleSide,
    toneMapped: true,
  });
}
