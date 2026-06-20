import * as THREE from 'three';

import { hologramScanlineShaders } from '../../../shaders/materials/story/hologramScanlineShaders';
import { createThreeShaderGlobalUniforms } from './ThreeShaderGlobalUniforms';

export interface HologramScanlineMaterialOptions {
  intensity: number;
  baseColor: string;
  scanlineColor: string;
  scanlineDensity: number;
  flickerStrength: number;
}

export function createHologramScanlineMaterial(
  options: HologramScanlineMaterialOptions,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'material:story.hologram-scanline',
    vertexShader: hologramScanlineShaders.vertexShader,
    fragmentShader: hologramScanlineShaders.fragmentShader,
    uniforms: {
      ...createThreeShaderGlobalUniforms(),
      uIntensity: { value: options.intensity },
      uBaseColor: { value: new THREE.Color(options.baseColor) },
      uScanlineColor: { value: new THREE.Color(options.scanlineColor) },
      uScanlineDensity: { value: options.scanlineDensity },
      uFlickerStrength: { value: options.flickerStrength },
    },
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true,
    transparent: true,
  });
}
