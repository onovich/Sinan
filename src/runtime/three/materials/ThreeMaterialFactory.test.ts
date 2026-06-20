import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { DEBUG_UV_GRADIENT_MATERIAL_ID, STORY_GATE_DISSOLVE_MATERIAL_ID } from '../../materials';
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
    expect(material.uniforms.uElapsedSeconds.value).toBe(0);
    expect(material.uniforms.uDeltaSeconds.value).toBe(0);
    expect(material.uniforms.uViewportSize.value).toEqual(new THREE.Vector2(1, 1));
    expect(material.uniforms.uCameraPosition.value).toEqual(new THREE.Vector3(0, 0, 0));
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

  it('creates the production gate dissolve ShaderMaterial from public parameters', () => {
    const result = new ThreeMaterialFactory().createMaterial({
      materialId: STORY_GATE_DISSOLVE_MATERIAL_ID,
      parameters: {
        progress: 0.6,
        edgeWidth: 0.12,
        edgeColor: '#ffffff',
        baseColor: '#111111',
        noiseScale: 14,
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.fallbackUsed).toBe(false);
    expect(result.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(result.material.name).toBe('material:story.gate-dissolve');

    const material = result.material as THREE.ShaderMaterial;
    expect(material.uniforms.uProgress.value).toBe(0.6);
    expect(material.uniforms.uEdgeWidth.value).toBe(0.12);
    expect(material.uniforms.uEdgeColor.value).toEqual(new THREE.Color('#ffffff'));
    expect(material.uniforms.uBaseColor.value).toEqual(new THREE.Color('#111111'));
    expect(material.uniforms.uNoiseScale.value).toBe(14);
    expect(material.uniforms.uElapsedSeconds.value).toBe(0);
    expect(material.uniforms.uViewportSize.value).toEqual(new THREE.Vector2(1, 1));
    expect(material.fragmentShader).toContain('uProgress');
    expect(material.vertexShader).toContain('vWorldPosition');
  });

  it('uses gate dissolve defaults when parameters are omitted', () => {
    const result = new ThreeMaterialFactory().createMaterial({
      materialId: STORY_GATE_DISSOLVE_MATERIAL_ID,
    });
    const material = result.material as THREE.ShaderMaterial;

    expect(result.fallbackUsed).toBe(false);
    expect(material.uniforms.uProgress.value).toBe(0);
    expect(material.uniforms.uEdgeWidth.value).toBe(0.08);
    expect((material.uniforms.uEdgeColor.value as THREE.Color).getHexString()).toBe('ffcf70');
    expect((material.uniforms.uBaseColor.value as THREE.Color).getHexString()).toBe('9b6a3c');
    expect(material.uniforms.uNoiseScale.value).toBe(8);
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

  it('creates a visible fallback for invalid gate dissolve parameters', () => {
    const result = new ThreeMaterialFactory().createMaterial({
      materialId: STORY_GATE_DISSOLVE_MATERIAL_ID,
      parameters: {
        progress: 2,
      },
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.material.name).toBe(FALLBACK_MATERIAL_NAME);
    expect(result.errors).toEqual([
      {
        code: 'invalid_parameters',
        materialId: STORY_GATE_DISSOLVE_MATERIAL_ID,
        parameter: 'progress',
        message: 'Number value 2 is above max 1.',
      },
    ]);
  });
});
