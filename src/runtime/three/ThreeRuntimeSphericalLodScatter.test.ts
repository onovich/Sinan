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

describe('spherical smoke perf low-end LOD scatter integration gate', () => {
  it('keeps projected demo placements readable while preserving LOD and scatter budgets', async () => {
    const project = await createDemoDataRepository().loadProjectLevel('level_01');
    const standardRuntime = createRuntimeAtDemoCamera();
    const standardSession = new EngineSession({ runtime: standardRuntime });

    try {
      await standardSession.loadProject(project);

      const spherical = standardRuntime.getSphericalPlacementDiagnostics();
      const switchPlacement = getPlacementTransform(project, standardRuntime, 'switch_a');

      expect(spherical).toMatchObject({
        issueCount: 0,
        placementCount: 7,
      });
      expect(new Set(spherical.placements.map((placement) => placement.regionId))).toEqual(
        new Set(['city', 'hill', 'beach']),
      );
      expect(standardRuntime.getTransform('switch_a')).toEqual(switchPlacement);
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
      expect(readRegionReadabilityHooks(project)).toEqual({
        lodRegions: ['city', 'hill', 'beach'],
        scatterRegions: ['city'],
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

  it('falls back to authored transforms and keeps scatter diagnostics when placement regions are stale', async () => {
    const project = await createDemoDataRepository().loadProjectLevel('level_01');
    const invalidProject = cloneProject(project);
    const switchEntity = invalidProject.level.entities.find((entity) => entity.id === 'switch_a');

    if (!switchEntity?.placement) {
      throw new Error('Expected switch_a spherical placement fixture.');
    }

    switchEntity.placement = {
      ...switchEntity.placement,
      region: 'missing_region',
    };

    const runtime = createRuntimeAtDemoCamera();
    const session = new EngineSession({ runtime });

    try {
      await session.loadProject(invalidProject);

      expect(runtime.getSphericalPlacementDiagnostics()).toMatchObject({
        issueCount: 1,
        issues: [
          {
            entityId: 'switch_a',
            reason: 'missing_region',
            regionId: 'missing_region',
          },
        ],
        placementCount: 6,
      });
      expect(runtime.getTransform('switch_a')).toEqual(switchEntity.transform);
      expect(readSwitchLod(runtime).entityId).toBe('switch_a');
      expect(runtime.getScatterDiagnostics()).toEqual([
        {
          fallbackUsed: false,
          groupId: 'scatter_switch_markers',
          instanceCount: 6,
          sourceAsset: 'model.switch_wall.lod2',
        },
      ]);
    } finally {
      session.dispose();
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

function getPlacementTransform(project: ProjectData, runtime: ThreeRuntime, entityId: string) {
  const placement = runtime
    .getSphericalPlacementDiagnostics()
    .placements.find((candidate) => candidate.entityId === entityId);

  if (!placement) {
    throw new Error(`Missing spherical placement for "${entityId}" in ${project.level.id}.`);
  }

  return placement.transform;
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

function readRegionReadabilityHooks(project: ProjectData): {
  lodRegions: string[];
  scatterRegions: string[];
} {
  const regions = project.level.worldProjection?.regions ?? [];

  return {
    lodRegions: regions.filter((region) => region.lodGroup).map((region) => region.id),
    scatterRegions: regions.filter((region) => region.scatterGroup).map((region) => region.id),
  };
}

function readMaxTriangles(project: ProjectData, assetId: string): number {
  const triangles = project.assets.assets[assetId]?.metadata?.maxTriangles;

  return typeof triangles === 'number' ? triangles : 0;
}

function cloneProject(project: ProjectData): ProjectData {
  return JSON.parse(JSON.stringify(project)) as ProjectData;
}
