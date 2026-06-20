import * as THREE from 'three';

import {
  DEBUG_UV_GRADIENT_MATERIAL_ID,
  STORY_GATE_DISSOLVE_MATERIAL_ID,
  STORY_HOLOGRAM_SCANLINE_MATERIAL_ID,
} from '../../src/runtime/materials';
import { ThreeMaterialFactory } from '../../src/runtime/three/materials/ThreeMaterialFactory';
import { ThreeMaterialRuntime } from '../../src/runtime/three/materials/ThreeMaterialRuntime';

export interface ShaderCompileSmokeResult {
  compileAsyncUsed: boolean;
  fragmentShaderPath: string;
  materialId: string;
  materialName: string;
  ok: boolean;
  programCount: number | null;
  vertexShaderPath: string;
}

export interface DissolveShaderSmokeResult extends ShaderCompileSmokeResult {
  dissolvedPixel: readonly [number, number, number, number];
  pixelDelta: number;
  runtimeParameterOk: boolean;
  visiblePixel: readonly [number, number, number, number];
}

export interface ShaderGlobalsSmokeResult extends ShaderCompileSmokeResult {
  baselinePixel: readonly [number, number, number, number];
  globalUpdateOk: boolean;
  memory: {
    geometries: number;
    textures: number;
  };
  timePixel: readonly [number, number, number, number];
  timePixelDelta: number;
  viewportPixel: readonly [number, number, number, number];
  viewportPixelDelta: number;
}

export interface ShaderLifecycleResourceSmokeResult {
  finalProgramCount: number | null;
  finalRuntimeBindingCount: number;
  iterations: number;
  maxRuntimeBindingCount: number;
  memoryAfterDispose: {
    geometries: number;
    textures: number;
  };
  memoryAfterWarmup: {
    geometries: number;
    textures: number;
  };
  ok: boolean;
  programGrowthAfterWarmup: number | null;
  warmProgramCount: number | null;
}

export async function compileDebugUvGradientMaterial(): Promise<ShaderCompileSmokeResult> {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  document.body.append(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.debug.checkShaderErrors = true;
  renderer.setSize(64, 64, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
  camera.position.z = 3;
  const factory = new ThreeMaterialFactory();
  const materialResult = factory.createMaterial({
    materialId: DEBUG_UV_GRADIENT_MATERIAL_ID,
    parameters: {
      baseColor: '#87c5ff',
      accentColor: '#ffcf70',
      strength: 0.8,
      uvScale: [1, 1],
    },
  });

  if (materialResult.errors.length > 0) {
    throw new Error(materialResult.errors.map((error) => error.message).join('; '));
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geometry, materialResult.material);
  scene.add(mesh);

  let compileAsyncUsed = false;

  try {
    if (typeof renderer.compileAsync === 'function') {
      compileAsyncUsed = true;
      await renderer.compileAsync(scene, camera);
    } else {
      renderer.compile(scene, camera);
    }

    renderer.render(scene, camera);

    return {
      compileAsyncUsed,
      fragmentShaderPath: 'src/shaders/materials/debug/debug-uv-gradient.frag.glsl',
      materialId: DEBUG_UV_GRADIENT_MATERIAL_ID,
      materialName: materialResult.material.name,
      ok: true,
      programCount: renderer.info.programs?.length ?? null,
      vertexShaderPath: 'src/shaders/materials/debug/debug-uv-gradient.vert.glsl',
    };
  } finally {
    geometry.dispose();
    materialResult.material.dispose();
    renderer.dispose();
    canvas.remove();
  }
}

export async function compileGateDissolveMaterial(): Promise<DissolveShaderSmokeResult> {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  document.body.append(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  renderer.debug.checkShaderErrors = true;
  renderer.setClearColor(0x000000, 1);
  renderer.setSize(64, 64, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 2;
  const geometry = new THREE.PlaneGeometry(1.8, 1.8);
  const originalMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const mesh = new THREE.Mesh(geometry, originalMaterial);
  const materialRuntime = new ThreeMaterialRuntime();
  const target = { entityId: 'gate_a', slot: 'main' };
  scene.add(mesh);
  materialRuntime.bindEntityObject(target.entityId, mesh);

  const applyResult = materialRuntime.applyMaterial(target, STORY_GATE_DISSOLVE_MATERIAL_ID, {
    progress: 0,
    edgeWidth: 0.08,
    edgeColor: '#ffcf70',
    baseColor: '#9b6a3c',
    noiseScale: 8,
  });

  if (!applyResult.ok) {
    throw new Error(applyResult.errors.map((error) => error.message).join('; '));
  }

  let compileAsyncUsed = false;

  try {
    if (typeof renderer.compileAsync === 'function') {
      compileAsyncUsed = true;
      await renderer.compileAsync(scene, camera);
    } else {
      renderer.compile(scene, camera);
    }

    renderer.render(scene, camera);
    const visiblePixel = readCenterPixel(renderer);
    const parameterResult = materialRuntime.setParameter(target, 'progress', 1);

    if (!parameterResult.ok) {
      throw new Error(parameterResult.errors.map((error) => error.message).join('; '));
    }

    renderer.render(scene, camera);
    const dissolvedPixel = readCenterPixel(renderer);

    return {
      compileAsyncUsed,
      dissolvedPixel,
      fragmentShaderPath: 'src/shaders/materials/story/gate-dissolve.frag.glsl',
      materialId: STORY_GATE_DISSOLVE_MATERIAL_ID,
      materialName: (mesh.material as THREE.Material).name,
      ok: true,
      pixelDelta: getPixelDelta(visiblePixel, dissolvedPixel),
      programCount: renderer.info.programs?.length ?? null,
      runtimeParameterOk: parameterResult.ok,
      vertexShaderPath: 'src/shaders/materials/story/gate-dissolve.vert.glsl',
      visiblePixel,
    };
  } finally {
    materialRuntime.disposeEntityMaterials(target.entityId);
    geometry.dispose();
    originalMaterial.dispose();
    renderer.dispose();
    canvas.remove();
  }
}

export async function renderDebugUvGradientWithShaderGlobals(): Promise<ShaderGlobalsSmokeResult> {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  document.body.append(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  renderer.debug.checkShaderErrors = true;
  renderer.setClearColor(0x000000, 1);
  renderer.setSize(64, 64, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 2;
  const geometry = new THREE.PlaneGeometry(1.8, 1.8);
  const originalMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const mesh = new THREE.Mesh(geometry, originalMaterial);
  const materialRuntime = new ThreeMaterialRuntime();
  const target = { entityId: 'switch_a', slot: 'main' };
  scene.add(mesh);
  materialRuntime.bindEntityObject(target.entityId, mesh);

  const applyResult = materialRuntime.applyMaterial(target, DEBUG_UV_GRADIENT_MATERIAL_ID, {
    baseColor: '#000000',
    accentColor: '#ffffff',
    strength: 1,
    uvScale: [1, 1],
  });

  if (!applyResult.ok) {
    throw new Error(applyResult.errors.map((error) => error.message).join('; '));
  }

  let compileAsyncUsed = false;

  try {
    if (typeof renderer.compileAsync === 'function') {
      compileAsyncUsed = true;
      await renderer.compileAsync(scene, camera);
    } else {
      renderer.compile(scene, camera);
    }

    renderer.render(scene, camera);
    const baselinePixel = readCenterPixel(renderer);

    materialRuntime.setShaderGlobals({
      elapsedSeconds: Math.PI / 4,
      deltaSeconds: 0.016,
      viewportSize: [64, 64],
    });
    renderer.render(scene, camera);
    const timePixel = readCenterPixel(renderer);

    materialRuntime.setShaderGlobals({
      elapsedSeconds: 0,
      deltaSeconds: 0.016,
      viewportSize: [128, 64],
    });
    renderer.render(scene, camera);
    const viewportPixel = readCenterPixel(renderer);

    const timePixelDelta = getPixelDelta(baselinePixel, timePixel);
    const viewportPixelDelta = getPixelDelta(baselinePixel, viewportPixel);

    return {
      baselinePixel,
      compileAsyncUsed,
      fragmentShaderPath: 'src/shaders/materials/debug/debug-uv-gradient.frag.glsl',
      globalUpdateOk: timePixelDelta > 8 && viewportPixelDelta > 8,
      materialId: DEBUG_UV_GRADIENT_MATERIAL_ID,
      materialName: (mesh.material as THREE.Material).name,
      memory: {
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      },
      ok: true,
      programCount: renderer.info.programs?.length ?? null,
      timePixel,
      timePixelDelta,
      vertexShaderPath: 'src/shaders/materials/debug/debug-uv-gradient.vert.glsl',
      viewportPixel,
      viewportPixelDelta,
    };
  } finally {
    materialRuntime.disposeEntityMaterials(target.entityId);
    geometry.dispose();
    originalMaterial.dispose();
    renderer.dispose();
    canvas.remove();
  }
}

export function runShaderMaterialLifecycleResourceSmoke(): ShaderLifecycleResourceSmokeResult {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  document.body.append(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  renderer.debug.checkShaderErrors = true;
  renderer.setClearColor(0x000000, 1);
  renderer.setSize(64, 64, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 2;
  const geometry = new THREE.PlaneGeometry(1.8, 1.8);
  const originalMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const mesh = new THREE.Mesh(geometry, originalMaterial);
  const materialRuntime = new ThreeMaterialRuntime();
  const target = { entityId: 'diagnostic_surface', slot: 'main' };
  const iterations = 18;
  let maxRuntimeBindingCount = 0;
  scene.add(mesh);
  materialRuntime.bindEntityObject(target.entityId, mesh);

  const materialCases: Array<{
    materialId: string;
    parameters: Record<string, number | string | readonly [number, number]>;
  }> = [
    {
      materialId: DEBUG_UV_GRADIENT_MATERIAL_ID,
      parameters: {
        baseColor: '#000000',
        accentColor: '#ffffff',
        strength: 1,
        uvScale: [1, 1],
      },
    },
    {
      materialId: STORY_GATE_DISSOLVE_MATERIAL_ID,
      parameters: {
        progress: 0,
        edgeWidth: 0.08,
        edgeColor: '#ffcf70',
        baseColor: '#9b6a3c',
        noiseScale: 8,
      },
    },
    {
      materialId: STORY_HOLOGRAM_SCANLINE_MATERIAL_ID,
      parameters: {
        intensity: 0.75,
        baseColor: '#5aa7d6',
        scanlineColor: '#ffcf70',
        scanlineDensity: 36,
        flickerStrength: 0.12,
      },
    },
  ];

  try {
    for (const materialCase of materialCases) {
      applyDiagnosticMaterial(
        materialRuntime,
        target,
        materialCase.materialId,
        materialCase.parameters,
      );
      renderer.render(scene, camera);
      maxRuntimeBindingCount = Math.max(
        maxRuntimeBindingCount,
        materialRuntime.getLifecycleDiagnostics().materialBindingCount,
      );
    }

    const warmProgramCount = renderer.info.programs?.length ?? null;
    const memoryAfterWarmup = {
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    };

    for (let index = 0; index < iterations; index += 1) {
      const materialCase = materialCases[index % materialCases.length];
      applyDiagnosticMaterial(
        materialRuntime,
        target,
        materialCase.materialId,
        materialCase.parameters,
      );
      materialRuntime.setShaderGlobals({
        elapsedSeconds: index * 0.1,
        deltaSeconds: 0.016,
        viewportSize: [64, 64],
      });
      renderer.render(scene, camera);
      maxRuntimeBindingCount = Math.max(
        maxRuntimeBindingCount,
        materialRuntime.getLifecycleDiagnostics().materialBindingCount,
      );
    }

    materialRuntime.disposeEntityMaterials(target.entityId);
    renderer.render(scene, camera);

    const finalProgramCount = renderer.info.programs?.length ?? null;
    const finalRuntimeBindingCount = materialRuntime.getLifecycleDiagnostics().materialBindingCount;
    const memoryAfterDispose = {
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    };
    const programGrowthAfterWarmup =
      finalProgramCount === null || warmProgramCount === null
        ? null
        : finalProgramCount - warmProgramCount;

    return {
      finalProgramCount,
      finalRuntimeBindingCount,
      iterations,
      maxRuntimeBindingCount,
      memoryAfterDispose,
      memoryAfterWarmup,
      ok:
        finalRuntimeBindingCount === 0 &&
        maxRuntimeBindingCount === 1 &&
        (programGrowthAfterWarmup === null || programGrowthAfterWarmup <= 1) &&
        memoryAfterDispose.geometries <= memoryAfterWarmup.geometries + 1 &&
        memoryAfterDispose.textures <= memoryAfterWarmup.textures + 1,
      programGrowthAfterWarmup,
      warmProgramCount,
    };
  } finally {
    materialRuntime.disposeEntityMaterials(target.entityId);
    geometry.dispose();
    originalMaterial.dispose();
    renderer.dispose();
    canvas.remove();
  }
}

function applyDiagnosticMaterial(
  materialRuntime: ThreeMaterialRuntime,
  target: { entityId: string; slot: string },
  materialId: string,
  parameters: Record<string, number | string | readonly [number, number]>,
): void {
  const result = materialRuntime.applyMaterial(target, materialId, parameters);

  if (!result.ok) {
    throw new Error(result.errors.map((error) => error.message).join('; '));
  }
}

function readCenterPixel(renderer: THREE.WebGLRenderer): [number, number, number, number] {
  const gl = renderer.getContext();
  const pixel = new Uint8Array(4);

  gl.readPixels(32, 32, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

  return [pixel[0], pixel[1], pixel[2], pixel[3]];
}

function getPixelDelta(
  left: readonly [number, number, number, number],
  right: readonly [number, number, number, number],
): number {
  return left.reduce((total, value, index) => total + Math.abs(value - right[index]), 0);
}
