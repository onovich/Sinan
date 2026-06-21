import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { createDemoDataRepository } from '../../data/demoDataLoader';
import type { ProjectData } from '../../data/DataRepository';
import { EngineSession } from '../../engine/EngineSession';
import {
  ThreeAssetLoader,
  type ThreeModelLoader,
  type ThreeModelLoadResult,
} from './ThreeAssetLoader';
import { ThreeRuntime } from './ThreeRuntime';

describe('Phase 22 LOD scatter instancing integrated gate', () => {
  it('loads committed demo data through EngineSession and reports stable runtime budgets', async () => {
    const project = await createDemoDataRepository().loadProjectLevel('level_01');
    const standardRuntime = createRuntimeAtDemoCamera();
    const standardSession = new EngineSession({ runtime: standardRuntime });

    try {
      await standardSession.loadProject(project);

      expect(readSwitchLod(standardRuntime)).toEqual({
        entityId: 'switch_a',
        currentLevel: 0,
        currentAsset: 'model.switch_wall.lod0',
      });
      expect(summarizeDemoPerf(project, standardRuntime)).toEqual({
        instancedDrawCallEstimate: 1,
        lodTriangleEstimate: 24,
        scatterInstanceCount: 6,
        scatterTriangleEstimate: 72,
      });
    } finally {
      standardSession.dispose();
    }

    const lowEndRuntime = createRuntimeAtDemoCamera();
    const lowEndSession = new EngineSession({
      runtime: lowEndRuntime,
      styleQualityProfile: 'low-end',
    });

    try {
      await lowEndSession.loadProject(project);

      expect(readSwitchLod(lowEndRuntime)).toEqual({
        entityId: 'switch_a',
        currentLevel: 1,
        currentAsset: 'model.switch_wall.lod1',
      });
      expect(summarizeDemoPerf(project, lowEndRuntime)).toEqual({
        instancedDrawCallEstimate: 1,
        lodTriangleEstimate: 12,
        scatterInstanceCount: 3,
        scatterTriangleEstimate: 36,
      });
    } finally {
      lowEndSession.dispose();
    }
  });
});

class FakeModelLoader implements ThreeModelLoader {
  load(url: string): Promise<ThreeModelLoadResult> {
    return Promise.resolve(createLoadResult(url));
  }
}

function createRuntimeAtDemoCamera(): ThreeRuntime {
  const runtime = new ThreeRuntime({
    modelAssets: new ThreeAssetLoader(new FakeModelLoader()),
  });

  setRuntimeCamera(runtime, [4, 2.6, 0.35]);

  return runtime;
}

function createLoadResult(url: string): ThreeModelLoadResult {
  const scene = new THREE.Group();
  const color = url.includes('lod2') ? 0x76b28b : url.includes('lod1') ? 0x5aa7d6 : 0x9f7b52;

  scene.add(
    new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color })),
  );

  return { scene, animations: [] };
}

function setRuntimeCamera(
  runtime: ThreeRuntime,
  position: readonly [number, number, number],
): void {
  (
    runtime as unknown as {
      camera: THREE.PerspectiveCamera;
    }
  ).camera = new THREE.PerspectiveCamera(64, 1, 0.1, 1000);
  (
    runtime as unknown as {
      camera: THREE.PerspectiveCamera;
    }
  ).camera.position.set(...position);
}

function readSwitchLod(runtime: ThreeRuntime): {
  currentAsset: string | undefined;
  currentLevel: number | undefined;
  entityId: string;
} {
  const lod = runtime.getLodDiagnostics().find((item) => item.entityId === 'switch_a');

  if (!lod) {
    throw new Error('Missing switch_a LOD diagnostics.');
  }

  return lod;
}

function summarizeDemoPerf(
  project: ProjectData,
  runtime: ThreeRuntime,
): {
  instancedDrawCallEstimate: number;
  lodTriangleEstimate: number;
  scatterInstanceCount: number;
  scatterTriangleEstimate: number;
} {
  const lod = readSwitchLod(runtime);
  const scatter = runtime
    .getScatterDiagnostics()
    .find((item) => item.groupId === 'scatter_switch_markers');
  const scatterInstanceCount = scatter?.instanceCount ?? 0;
  const scatterTrianglesPerInstance = scatter?.sourceAsset
    ? readMaxTriangles(project, scatter.sourceAsset)
    : 0;

  return {
    instancedDrawCallEstimate: scatter ? 1 : 0,
    lodTriangleEstimate: lod.currentAsset ? readMaxTriangles(project, lod.currentAsset) : 0,
    scatterInstanceCount,
    scatterTriangleEstimate: scatterTrianglesPerInstance * scatterInstanceCount,
  };
}

function readMaxTriangles(project: ProjectData, assetId: string): number {
  const triangles = project.assets.assets[assetId]?.metadata?.maxTriangles;

  return typeof triangles === 'number' ? triangles : 0;
}
