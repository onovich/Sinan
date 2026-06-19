import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { DEBUG_UV_GRADIENT_MATERIAL_ID } from '../../materials';
import { FALLBACK_MATERIAL_NAME } from './createFallbackMaterial';
import { ThreeMaterialFactory } from './ThreeMaterialFactory';

describe('ThreeMaterialFactory', () => {
  it('creates the S0 debug ShaderMaterial from public parameters', () => {
    const result = new ThreeMaterialFactory().createMaterial({
      materialId: DEBUG_UV_GRADIENT_MATERIAL_ID,
      parameters: {
        baseColor: '#ffffff',
        accentColor: '#000000',
        strength: 0.25,
        uvScale: [2, 3],
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.fallbackUsed).toBe(false);
    expect(result.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(result.material.name).toBe('material:debug.uv-gradient');

    const material = result.material as THREE.ShaderMaterial;
    expect(material.uniforms.uBaseColor.value).toBeInstanceOf(THREE.Color);
    expect(material.uniforms.uAccentColor.value).toBeInstanceOf(THREE.Color);
    expect(material.uniforms.uStrength.value).toBe(0.25);
    expect(material.uniforms.uUvScale.value).toEqual(new THREE.Vector2(2, 3));
  });

  it('uses deterministic definition defaults when parameters are omitted', () => {
    const result = new ThreeMaterialFactory().createMaterial({
      materialId: DEBUG_UV_GRADIENT_MATERIAL_ID,
    });
    const material = result.material as THREE.ShaderMaterial;
    const baseColor = material.uniforms.uBaseColor.value as THREE.Color;
    const accentColor = material.uniforms.uAccentColor.value as THREE.Color;

    expect(result.fallbackUsed).toBe(false);
    expect(baseColor.getHexString()).toBe('87c5ff');
    expect(accentColor.getHexString()).toBe('ffcf70');
    expect(material.uniforms.uStrength.value).toBe(1);
    expect(material.uniforms.uUvScale.value).toEqual(new THREE.Vector2(1, 1));
  });

  it('creates a visible fallback for missing materials', () => {
    const result = new ThreeMaterialFactory().createMaterial({
      materialId: 'debug.missing',
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(result.material.name).toBe(FALLBACK_MATERIAL_NAME);
    expect(result.errors).toEqual([
      {
        code: 'missing_material',
        materialId: 'debug.missing',
        message: 'Missing material definition "debug.missing".',
      },
    ]);
  });

  it('creates a visible fallback for invalid public parameters', () => {
    const result = new ThreeMaterialFactory().createMaterial({
      materialId: DEBUG_UV_GRADIENT_MATERIAL_ID,
      parameters: {
        strength: 2,
      },
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.material.name).toBe(FALLBACK_MATERIAL_NAME);
    expect(result.errors).toEqual([
      {
        code: 'invalid_parameters',
        materialId: DEBUG_UV_GRADIENT_MATERIAL_ID,
        parameter: 'strength',
        message: 'Number value 2 is above max 1.',
      },
    ]);
  });
});
