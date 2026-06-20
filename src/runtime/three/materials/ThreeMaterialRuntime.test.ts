import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  DEBUG_UV_GRADIENT_MATERIAL_ID,
  STORY_GATE_DISSOLVE_MATERIAL_ID,
  STORY_HOLOGRAM_SCANLINE_MATERIAL_ID,
} from '../../materials';
import { FALLBACK_MATERIAL_NAME } from './createFallbackMaterial';
import { ThreeMaterialRuntime } from './ThreeMaterialRuntime';

const target = { entityId: 'switch_a', slot: 'main' };

describe('ThreeMaterialRuntime', () => {
  it('binds a debug shader material to an entity main slot', () => {
    const mesh = createMesh();
    const runtime = new ThreeMaterialRuntime();

    runtime.bindEntityObject(target.entityId, mesh);
    const result = runtime.applyMaterial(target, DEBUG_UV_GRADIENT_MATERIAL_ID, {
      strength: 0.25,
    });

    expect(result).toEqual({ ok: true, errors: [] });
    expect(mesh.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(runtime.getParameter(target, 'strength')).toBe(0.25);
  });

  it('sets and resets public parameters through Three uniforms', () => {
    const mesh = createMesh();
    const runtime = new ThreeMaterialRuntime();

    runtime.bindEntityObject(target.entityId, mesh);
    runtime.applyMaterial(target, DEBUG_UV_GRADIENT_MATERIAL_ID);

    expect(runtime.setParameter(target, 'strength', 0.4)).toEqual({ ok: true, errors: [] });

    const material = mesh.material as THREE.ShaderMaterial;
    expect(material.uniforms.uStrength.value).toBe(0.4);
    expect(runtime.getParameter(target, 'strength')).toBe(0.4);

    expect(runtime.resetParameter(target, 'strength')).toEqual({ ok: true, errors: [] });
    expect(material.uniforms.uStrength.value).toBe(1);
    expect(runtime.getParameter(target, 'strength')).toBe(1);
  });

  it('updates shader globals on bound shader materials without replacing vector uniforms', () => {
    const mesh = createMesh();
    const runtime = new ThreeMaterialRuntime();

    runtime.bindEntityObject(target.entityId, mesh);
    runtime.applyMaterial(target, DEBUG_UV_GRADIENT_MATERIAL_ID);

    const material = mesh.material as THREE.ShaderMaterial;
    const viewportUniform = material.uniforms.uViewportSize.value as THREE.Vector2;
    const cameraUniform = material.uniforms.uCameraPosition.value as THREE.Vector3;

    runtime.setShaderGlobals({
      elapsedSeconds: 2,
      deltaSeconds: 0.016,
      viewportSize: [128, 64],
      cameraPosition: [1, 2, 3],
    });

    expect(material.uniforms.uElapsedSeconds.value).toBe(2);
    expect(material.uniforms.uDeltaSeconds.value).toBe(0.016);
    expect(material.uniforms.uViewportSize.value).toBe(viewportUniform);
    expect(viewportUniform).toEqual(new THREE.Vector2(128, 64));
    expect(material.uniforms.uCameraPosition.value).toBe(cameraUniform);
    expect(cameraUniform).toEqual(new THREE.Vector3(1, 2, 3));

    runtime.setShaderGlobals({
      elapsedSeconds: 3,
      deltaSeconds: 0.033,
      viewportSize: [256, 128],
      cameraPosition: [4, 5, 6],
    });

    expect(material.uniforms.uElapsedSeconds.value).toBe(3);
    expect(material.uniforms.uViewportSize.value).toBe(viewportUniform);
    expect(viewportUniform).toEqual(new THREE.Vector2(256, 128));
    expect(material.uniforms.uCameraPosition.value).toBe(cameraUniform);
    expect(cameraUniform).toEqual(new THREE.Vector3(4, 5, 6));
  });

  it('sets and resets gate dissolve public parameters through Three uniforms', () => {
    const mesh = createMesh();
    const runtime = new ThreeMaterialRuntime();

    runtime.bindEntityObject(target.entityId, mesh);
    runtime.applyMaterial(target, STORY_GATE_DISSOLVE_MATERIAL_ID, {
      progress: 0.2,
      edgeWidth: 0.1,
    });

    expect(runtime.setParameter(target, 'progress', 0.75)).toEqual({ ok: true, errors: [] });
    expect(runtime.setParameter(target, 'edgeWidth', 0.2)).toEqual({ ok: true, errors: [] });
    expect(runtime.setParameter(target, 'edgeColor', '#ffffff')).toEqual({ ok: true, errors: [] });
    expect(runtime.setParameter(target, 'baseColor', '#111111')).toEqual({ ok: true, errors: [] });
    expect(runtime.setParameter(target, 'noiseScale', 14)).toEqual({ ok: true, errors: [] });

    const material = mesh.material as THREE.ShaderMaterial;
    expect(material.uniforms.uProgress.value).toBe(0.75);
    expect(material.uniforms.uEdgeWidth.value).toBe(0.2);
    expect((material.uniforms.uEdgeColor.value as THREE.Color).getHexString()).toBe('ffffff');
    expect((material.uniforms.uBaseColor.value as THREE.Color).getHexString()).toBe('111111');
    expect(material.uniforms.uNoiseScale.value).toBe(14);
    expect(runtime.getParameter(target, 'progress')).toBe(0.75);

    expect(runtime.resetParameter(target, 'progress')).toEqual({ ok: true, errors: [] });
    expect(material.uniforms.uProgress.value).toBe(0);
    expect(runtime.getParameter(target, 'progress')).toBe(0);
  });

  it('sets and resets hologram scanline public parameters through Three uniforms', () => {
    const mesh = createMesh();
    const runtime = new ThreeMaterialRuntime();

    runtime.bindEntityObject(target.entityId, mesh);
    runtime.applyMaterial(target, STORY_HOLOGRAM_SCANLINE_MATERIAL_ID, {
      intensity: 0.8,
      scanlineDensity: 42,
    });

    expect(runtime.setParameter(target, 'intensity', 0.4)).toEqual({ ok: true, errors: [] });
    expect(runtime.setParameter(target, 'baseColor', '#111111')).toEqual({ ok: true, errors: [] });
    expect(runtime.setParameter(target, 'scanlineColor', '#ffffff')).toEqual({
      ok: true,
      errors: [],
    });
    expect(runtime.setParameter(target, 'scanlineDensity', 64)).toEqual({
      ok: true,
      errors: [],
    });
    expect(runtime.setParameter(target, 'flickerStrength', 0.25)).toEqual({
      ok: true,
      errors: [],
    });

    const material = mesh.material as THREE.ShaderMaterial;
    expect(material.uniforms.uIntensity.value).toBe(0.4);
    expect((material.uniforms.uBaseColor.value as THREE.Color).getHexString()).toBe('111111');
    expect((material.uniforms.uScanlineColor.value as THREE.Color).getHexString()).toBe('ffffff');
    expect(material.uniforms.uScanlineDensity.value).toBe(64);
    expect(material.uniforms.uFlickerStrength.value).toBe(0.25);
    expect(runtime.getParameter(target, 'scanlineDensity')).toBe(64);

    expect(runtime.resetParameter(target, 'scanlineDensity')).toEqual({ ok: true, errors: [] });
    expect(material.uniforms.uScanlineDensity.value).toBe(36);
    expect(runtime.getParameter(target, 'scanlineDensity')).toBe(36);
  });

  it('returns a deterministic error for missing material bindings', () => {
    const runtime = new ThreeMaterialRuntime();

    expect(runtime.setParameter(target, 'progress', 0.5)).toEqual({
      ok: false,
      errors: [
        {
          code: 'missing_material_binding',
          message: 'No material is bound for entity "switch_a" slot "main".',
          parameter: 'progress',
          target,
        },
      ],
    });
  });

  it('rejects unknown gate dissolve parameters without mutating known uniforms', () => {
    const mesh = createMesh();
    const runtime = new ThreeMaterialRuntime();

    runtime.bindEntityObject(target.entityId, mesh);
    runtime.applyMaterial(target, STORY_GATE_DISSOLVE_MATERIAL_ID);

    expect(runtime.setParameter(target, 'missing', 1)).toEqual({
      ok: false,
      errors: [
        {
          code: 'invalid_parameter',
          message: `Unknown material parameter "missing" for material "${STORY_GATE_DISSOLVE_MATERIAL_ID}".`,
          materialId: STORY_GATE_DISSOLVE_MATERIAL_ID,
          parameter: 'missing',
          target,
        },
      ],
    });

    const material = mesh.material as THREE.ShaderMaterial;
    expect(material.uniforms.uProgress.value).toBe(0);
  });

  it('binds fallback material and returns errors when factory validation fails', () => {
    const mesh = createMesh();
    const runtime = new ThreeMaterialRuntime();

    runtime.bindEntityObject(target.entityId, mesh);
    const result = runtime.applyMaterial(target, 'debug.missing');

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      {
        code: 'missing_material',
        message: 'Missing material definition "debug.missing".',
        materialId: 'debug.missing',
        target,
      },
    ]);
    expect(mesh.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(mesh.material.name).toBe(FALLBACK_MATERIAL_NAME);
    expect(() =>
      runtime.setShaderGlobals({
        elapsedSeconds: 1,
        deltaSeconds: 0.016,
        viewportSize: [64, 64],
      }),
    ).not.toThrow();
  });

  it('restores original materials and disposes owned material instances', () => {
    const originalMaterial = new THREE.MeshBasicMaterial({ color: 0x123456 });
    const mesh: THREE.Mesh<THREE.BoxGeometry, THREE.Material> = new THREE.Mesh(
      new THREE.BoxGeometry(),
      originalMaterial,
    );
    const runtime = new ThreeMaterialRuntime();

    runtime.bindEntityObject(target.entityId, mesh);
    runtime.applyMaterial(target, DEBUG_UV_GRADIENT_MATERIAL_ID);

    const shaderMaterial = mesh.material as THREE.ShaderMaterial;
    let disposed = false;
    shaderMaterial.addEventListener('dispose', () => {
      disposed = true;
    });

    runtime.disposeEntityMaterials(target.entityId);

    expect(disposed).toBe(true);
    expect(mesh.material).toBe(originalMaterial);
    expect(() =>
      runtime.setShaderGlobals({
        elapsedSeconds: 1,
        deltaSeconds: 0.016,
        viewportSize: [64, 64],
      }),
    ).not.toThrow();
  });

  it('rejects unsupported slots without mutating the mesh', () => {
    const mesh = createMesh();
    const originalMaterial = mesh.material;
    const runtime = new ThreeMaterialRuntime();
    const unsupportedTarget = { entityId: target.entityId, slot: 'rim' };

    runtime.bindEntityObject(target.entityId, mesh);
    const result = runtime.applyMaterial(unsupportedTarget, DEBUG_UV_GRADIENT_MATERIAL_ID);

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: 'unsupported_slot',
          message: 'Unsupported renderable material slot "rim". Supported slots: main.',
          target: unsupportedTarget,
        },
      ],
    });
    expect(mesh.material).toBe(originalMaterial);
  });
});

function createMesh(): THREE.Mesh<THREE.BoxGeometry, THREE.Material> {
  return new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
}
