import * as THREE from 'three';

import { DEBUG_UV_GRADIENT_MATERIAL_ID } from '../../src/runtime/materials';
import { ThreeMaterialFactory } from '../../src/runtime/three/materials/ThreeMaterialFactory';

export interface ShaderCompileSmokeResult {
  compileAsyncUsed: boolean;
  fragmentShaderPath: string;
  materialId: string;
  materialName: string;
  ok: boolean;
  programCount: number | null;
  vertexShaderPath: string;
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
