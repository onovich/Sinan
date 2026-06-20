import * as THREE from 'three';

import { debugUvGradientShaders } from '../../../shaders/materials/debug/debugUvGradientShaders';
import { createThreeShaderGlobalUniforms } from './ThreeShaderGlobalUniforms';

export interface DebugUvGradientMaterialOptions {
  baseColor: string;
  accentColor: string;
  strength: number;
  uvScale: readonly [number, number];
}

export function createDebugUvGradientMaterial(
  options: DebugUvGradientMaterialOptions,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'material:debug.uv-gradient',
    vertexShader: debugUvGradientShaders.vertexShader,
    fragmentShader: debugUvGradientShaders.fragmentShader,
    uniforms: {
      ...createThreeShaderGlobalUniforms(),
      uBaseColor: { value: new THREE.Color(options.baseColor) },
      uAccentColor: { value: new THREE.Color(options.accentColor) },
      uStrength: { value: options.strength },
      uUvScale: { value: new THREE.Vector2(...options.uvScale) },
    },
    toneMapped: true,
  });
}
