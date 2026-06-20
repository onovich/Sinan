import * as THREE from 'three';

import {
  DEBUG_UV_GRADIENT_MATERIAL_ID,
  STORY_GATE_DISSOLVE_MATERIAL_ID,
  STORY_HOLOGRAM_SCANLINE_MATERIAL_ID,
} from '../../src/runtime/materials';
import {
  CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID,
  createDefaultPostProcessRegistry,
} from '../../src/runtime/postprocess';
import { ThreeMaterialFactory } from '../../src/runtime/three/materials/ThreeMaterialFactory';
import { ThreeMaterialRuntime } from '../../src/runtime/three/materials/ThreeMaterialRuntime';
import {
  createMaterialRuntimeDiagnostic,
  formatShaderDiagnostic,
} from '../../src/runtime/three/ShaderDiagnostics';
import { ThreePostProcessRuntime } from '../../src/runtime/three/ThreePostProcessRuntime';
import { postProcessVisualBaselines } from '../visual/postProcessVisualBaselines';
import { shaderMaterialVisualBaselines } from '../visual/shaderMaterialVisualBaselines';
import {
  compareVisualFixture,
  type VisualFixtureComparison,
  type VisualFixtureBaseline,
} from '../visual/shaderVisualRegression';

export interface ShaderCompileSmokeResult {
  compileAsyncUsed: boolean;
  fragmentShaderPath: string;
  materialId: string;
  materialName: string;
  ok: boolean;
  programCount: number | null;
  runtimeContext: string;
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

export interface HologramScanlineShaderSmokeResult extends ShaderCompileSmokeResult {
  visiblePixel: readonly [number, number, number, number];
}

export interface ShaderMaterialVisualRegressionSmokeResult {
  comparisons: readonly VisualFixtureComparison[];
  fixtureCount: number;
  issues: readonly string[];
  ok: boolean;
}

export interface PostProcessVisualRegressionSmokeResult {
  comparisons: readonly VisualFixtureComparison[];
  fixtureCount: number;
  issues: readonly string[];
  ok: boolean;
}

export interface ShaderFallbackDiagnosticsSmokeResult {
  diagnosticMessages: readonly string[];
  fallbackMaterialName: string;
  fallbackPixel: readonly [number, number, number, number];
  fallbackVisible: boolean;
  ok: boolean;
}

export interface LowEndShaderBaselineSmokeResult {
  budget: {
    maxDurationMs: number;
    maxGeometries: number;
    maxProgramCount: number;
    maxTextures: number;
  };
  durationMs: number;
  edgeDarkeningDelta: number;
  gatePixel: readonly [number, number, number, number];
  hologramPixel: readonly [number, number, number, number];
  memory: {
    geometries: number;
    textures: number;
  };
  ok: boolean;
  pixelRatio: number;
  programCount: number | null;
  viewport: {
    height: number;
    width: number;
  };
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

export interface PostProcessVignetteSmokeResult {
  centerPixel: readonly [number, number, number, number];
  cornerPixel: readonly [number, number, number, number];
  edgeDarkeningDelta: number;
  effectId: string;
  memory: {
    geometries: number;
    textures: number;
  };
  ok: boolean;
  passSourcePath: string;
  programCount: number | null;
  runtimeContext: string;
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
      runtimeContext: 'smoke.shader.compile',
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
      runtimeContext: 'smoke.shader.compile',
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
      runtimeContext: 'smoke.shader.compile',
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

export async function compileHologramScanlineMaterial(): Promise<HologramScanlineShaderSmokeResult> {
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
  const target = { entityId: 'hologram_panel', slot: 'main' };
  scene.add(mesh);
  materialRuntime.bindEntityObject(target.entityId, mesh);

  const applyResult = materialRuntime.applyMaterial(target, STORY_HOLOGRAM_SCANLINE_MATERIAL_ID, {
    intensity: 0.95,
    baseColor: '#5aa7d6',
    scanlineColor: '#ffcf70',
    scanlineDensity: 18,
    flickerStrength: 0.2,
  });

  if (!applyResult.ok) {
    throw new Error(applyResult.errors.map((error) => error.message).join('; '));
  }

  materialRuntime.setShaderGlobals({
    elapsedSeconds: 0.4,
    deltaSeconds: 0.016,
    viewportSize: [64, 64],
  });

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

    return {
      compileAsyncUsed,
      fragmentShaderPath: 'src/shaders/materials/story/hologram-scanline.frag.glsl',
      materialId: STORY_HOLOGRAM_SCANLINE_MATERIAL_ID,
      materialName: (mesh.material as THREE.Material).name,
      ok: true,
      programCount: renderer.info.programs?.length ?? null,
      runtimeContext: 'smoke.shader.compile',
      vertexShaderPath: 'src/shaders/materials/story/hologram-scanline.vert.glsl',
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

export async function renderProductionMaterialVisualRegression(): Promise<ShaderMaterialVisualRegressionSmokeResult> {
  const comparisons: VisualFixtureComparison[] = [];

  for (const baseline of shaderMaterialVisualBaselines) {
    comparisons.push(await renderMaterialVisualFixture(baseline));
  }

  const issues = comparisons.flatMap((comparison) => comparison.issues);

  return {
    comparisons,
    fixtureCount: comparisons.length,
    issues,
    ok: issues.length === 0,
  };
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

export function renderPostProcessVignetteSmoke(): PostProcessVignetteSmokeResult {
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
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mesh = new THREE.Mesh(geometry, material);
  const postProcessRuntime = new ThreePostProcessRuntime();
  const postProcessRegistry = createDefaultPostProcessRegistry();
  const publicParameters = {
    enabled: true,
    intensity: 0.85,
    softness: 0.25,
  };
  const parameterIssues = postProcessRegistry.validateParameters(
    CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID,
    publicParameters,
  );
  const resolvedParameters = postProcessRegistry.resolveParameters(
    CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID,
    publicParameters,
  );

  if (parameterIssues.length > 0 || !resolvedParameters) {
    throw new Error(parameterIssues.map((issue) => issue.message).join('; '));
  }

  scene.add(mesh);
  postProcessRuntime.setVignette({
    enabled: resolvedParameters.enabled === true,
    intensity: resolvedParameters.intensity as number,
    softness: resolvedParameters.softness as number,
  });
  postProcessRuntime.init({
    camera,
    enabled: true,
    height: 64,
    pixelRatio: 1,
    renderer,
    scene,
    width: 64,
  });

  try {
    postProcessRuntime.render(() => renderer.render(scene, camera));
    const centerPixel = readPixel(renderer, 32, 32);
    const cornerPixel = readPixel(renderer, 4, 4);
    const edgeDarkeningDelta = getPixelDelta(centerPixel, cornerPixel);

    return {
      centerPixel,
      cornerPixel,
      edgeDarkeningDelta,
      effectId: CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID,
      memory: {
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      },
      ok: edgeDarkeningDelta > 20 && centerPixel[3] === 255 && cornerPixel[3] === 255,
      passSourcePath: 'src/runtime/three/ThreePostProcessRuntime.ts',
      programCount: renderer.info.programs?.length ?? null,
      runtimeContext: 'smoke.postprocess.render',
    };
  } finally {
    postProcessRuntime.dispose();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    canvas.remove();
  }
}

export function renderPostProcessVisualRegression(): PostProcessVisualRegressionSmokeResult {
  const comparisons: VisualFixtureComparison[] = [];

  for (const baseline of postProcessVisualBaselines) {
    comparisons.push(renderPostProcessVisualFixture(baseline));
  }

  const issues = comparisons.flatMap((comparison) => comparison.issues);

  return {
    comparisons,
    fixtureCount: comparisons.length,
    issues,
    ok: issues.length === 0,
  };
}

export function renderShaderFallbackDiagnosticsSmoke(): ShaderFallbackDiagnosticsSmokeResult {
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
  const target = { entityId: 'missing_shader_panel', slot: 'main' };
  scene.add(mesh);
  materialRuntime.bindEntityObject(target.entityId, mesh);

  const applyResult = materialRuntime.applyMaterial(target, 'story.missing');

  try {
    renderer.render(scene, camera);
    const fallbackPixel = readCenterPixel(renderer);
    const fallbackMaterialName = (mesh.material as THREE.Material).name;
    const fallbackVisible =
      fallbackPixel[0] > 200 && fallbackPixel[1] < 80 && fallbackPixel[2] > 200;
    const diagnosticMessages = applyResult.errors.map((error) =>
      formatShaderDiagnostic(
        createMaterialRuntimeDiagnostic(error, 'smoke.shader.fallback', 'missing-material'),
      ),
    );

    return {
      diagnosticMessages,
      fallbackMaterialName,
      fallbackPixel,
      fallbackVisible,
      ok: !applyResult.ok && fallbackVisible && diagnosticMessages.length > 0,
    };
  } finally {
    materialRuntime.disposeEntityMaterials(target.entityId);
    geometry.dispose();
    originalMaterial.dispose();
    renderer.dispose();
    canvas.remove();
  }
}

export async function runLowEndShaderBaselineSmoke(): Promise<LowEndShaderBaselineSmokeResult> {
  const viewport = { width: 360, height: 640 };
  const budget = {
    maxDurationMs: 2_500,
    maxGeometries: 6,
    maxProgramCount: 8,
    maxTextures: 6,
  };
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  document.body.append(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  renderer.debug.checkShaderErrors = true;
  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(1);
  renderer.setSize(viewport.width, viewport.height, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 2;
  const geometry = new THREE.PlaneGeometry(1.8, 1.8);
  const originalMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const mesh = new THREE.Mesh(geometry, originalMaterial);
  const materialRuntime = new ThreeMaterialRuntime();
  const postProcessRuntime = new ThreePostProcessRuntime();
  const target = { entityId: 'low_end_shader_panel', slot: 'main' };
  const start = performance.now();

  scene.add(mesh);
  materialRuntime.bindEntityObject(target.entityId, mesh);

  try {
    applyDiagnosticMaterial(materialRuntime, target, STORY_GATE_DISSOLVE_MATERIAL_ID, {
      progress: 0,
      edgeWidth: 0.08,
      edgeColor: '#ffcf70',
      baseColor: '#9b6a3c',
      noiseScale: 8,
    });
    await compileScene(renderer, scene, camera);
    renderer.render(scene, camera);
    const gatePixel = readCenterPixel(renderer);

    applyDiagnosticMaterial(materialRuntime, target, STORY_HOLOGRAM_SCANLINE_MATERIAL_ID, {
      intensity: 0.95,
      baseColor: '#5aa7d6',
      scanlineColor: '#ffcf70',
      scanlineDensity: 18,
      flickerStrength: 0.2,
    });
    materialRuntime.setShaderGlobals({
      elapsedSeconds: 0.4,
      deltaSeconds: 0.016,
      viewportSize: [viewport.width, viewport.height],
    });
    await compileScene(renderer, scene, camera);
    renderer.render(scene, camera);
    const hologramPixel = readCenterPixel(renderer);

    materialRuntime.disposeEntityMaterials(target.entityId);
    mesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    postProcessRuntime.setVignette({
      enabled: true,
      intensity: 0.85,
      softness: 0.25,
    });
    postProcessRuntime.init({
      camera,
      enabled: true,
      height: viewport.height,
      pixelRatio: 1,
      renderer,
      scene,
      width: viewport.width,
    });
    postProcessRuntime.render(() => renderer.render(scene, camera));
    const centerPixel = readPixel(renderer, 180, 320);
    const cornerPixel = readPixel(renderer, 24, 24);
    const edgeDarkeningDelta = getPixelDelta(centerPixel, cornerPixel);
    const durationMs = performance.now() - start;
    const programCount = renderer.info.programs?.length ?? null;
    const memory = {
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    };

    return {
      budget,
      durationMs,
      edgeDarkeningDelta,
      gatePixel,
      hologramPixel,
      memory,
      ok:
        gatePixel[3] === 255 &&
        hologramPixel[3] === 255 &&
        edgeDarkeningDelta > 20 &&
        durationMs <= budget.maxDurationMs &&
        (programCount === null || programCount <= budget.maxProgramCount) &&
        memory.geometries <= budget.maxGeometries &&
        memory.textures <= budget.maxTextures,
      pixelRatio: 1,
      programCount,
      viewport,
    };
  } finally {
    postProcessRuntime.dispose();
    materialRuntime.disposeEntityMaterials(target.entityId);
    geometry.dispose();
    if (mesh.material instanceof THREE.Material) {
      mesh.material.dispose();
    }
    originalMaterial.dispose();
    renderer.dispose();
    canvas.remove();
  }
}

async function renderMaterialVisualFixture(
  baseline: VisualFixtureBaseline,
): Promise<VisualFixtureComparison> {
  const canvas = document.createElement('canvas');
  canvas.width = baseline.viewport.width;
  canvas.height = baseline.viewport.height;
  document.body.append(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  renderer.debug.checkShaderErrors = true;
  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(baseline.viewport.pixelRatio ?? 1);
  renderer.setSize(baseline.viewport.width, baseline.viewport.height, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.set(...baseline.camera.position);
  camera.lookAt(...(baseline.camera.target ?? [0, 0, 0]));

  const geometry = new THREE.PlaneGeometry(1.8, 1.8);
  const originalMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const mesh = new THREE.Mesh(geometry, originalMaterial);
  const materialRuntime = new ThreeMaterialRuntime();
  const target = { entityId: baseline.id, slot: 'main' };

  scene.add(mesh);
  materialRuntime.bindEntityObject(target.entityId, mesh);

  const applyResult = materialRuntime.applyMaterial(
    target,
    baseline.target.id,
    baseline.parameters,
  );

  if (!applyResult.ok) {
    throw new Error(applyResult.errors.map((error) => error.message).join('; '));
  }

  if (baseline.shaderGlobals) {
    materialRuntime.setShaderGlobals(baseline.shaderGlobals);
  }

  try {
    if (typeof renderer.compileAsync === 'function') {
      await renderer.compileAsync(scene, camera);
    } else {
      renderer.compile(scene, camera);
    }

    renderer.render(scene, camera);

    return compareVisualFixture(baseline, {
      fixtureId: baseline.id,
      samples: baseline.samples.map((sample) => ({
        label: sample.label,
        observed: readPixel(renderer, sample.point[0], sample.point[1]),
      })),
    });
  } finally {
    materialRuntime.disposeEntityMaterials(target.entityId);
    geometry.dispose();
    originalMaterial.dispose();
    renderer.dispose();
    canvas.remove();
  }
}

function renderPostProcessVisualFixture(baseline: VisualFixtureBaseline): VisualFixtureComparison {
  const canvas = document.createElement('canvas');
  canvas.width = baseline.viewport.width;
  canvas.height = baseline.viewport.height;
  document.body.append(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  renderer.debug.checkShaderErrors = true;
  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(baseline.viewport.pixelRatio ?? 1);
  renderer.setSize(baseline.viewport.width, baseline.viewport.height, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.set(...baseline.camera.position);
  camera.lookAt(...(baseline.camera.target ?? [0, 0, 0]));

  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mesh = new THREE.Mesh(geometry, material);
  const postProcessRuntime = new ThreePostProcessRuntime();
  const postProcessRegistry = createDefaultPostProcessRegistry();
  const parameterIssues = postProcessRegistry.validateParameters(
    baseline.target.id,
    baseline.parameters,
  );
  const resolvedParameters = postProcessRegistry.resolveParameters(
    baseline.target.id,
    baseline.parameters,
  );

  if (parameterIssues.length > 0 || !resolvedParameters) {
    throw new Error(parameterIssues.map((issue) => issue.message).join('; '));
  }

  scene.add(mesh);
  postProcessRuntime.setVignette({
    enabled: resolvedParameters.enabled === true,
    intensity: resolvedParameters.intensity as number,
    softness: resolvedParameters.softness as number,
  });
  postProcessRuntime.init({
    camera,
    enabled: true,
    height: baseline.viewport.height,
    pixelRatio: baseline.viewport.pixelRatio ?? 1,
    renderer,
    scene,
    width: baseline.viewport.width,
  });

  try {
    postProcessRuntime.render(() => renderer.render(scene, camera));

    return compareVisualFixture(baseline, {
      fixtureId: baseline.id,
      samples: baseline.samples.map((sample) => ({
        label: sample.label,
        observed: readPixel(renderer, sample.point[0], sample.point[1]),
      })),
    });
  } finally {
    postProcessRuntime.dispose();
    geometry.dispose();
    material.dispose();
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

async function compileScene(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): Promise<void> {
  if (typeof renderer.compileAsync === 'function') {
    await renderer.compileAsync(scene, camera);
    return;
  }

  renderer.compile(scene, camera);
}

function readCenterPixel(renderer: THREE.WebGLRenderer): [number, number, number, number] {
  return readPixel(renderer, 32, 32);
}

function readPixel(
  renderer: THREE.WebGLRenderer,
  x: number,
  y: number,
): [number, number, number, number] {
  const gl = renderer.getContext();
  const pixel = new Uint8Array(4);

  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

  return [pixel[0], pixel[1], pixel[2], pixel[3]];
}

function getPixelDelta(
  left: readonly [number, number, number, number],
  right: readonly [number, number, number, number],
): number {
  return left.reduce((total, value, index) => total + Math.abs(value - right[index]), 0);
}
