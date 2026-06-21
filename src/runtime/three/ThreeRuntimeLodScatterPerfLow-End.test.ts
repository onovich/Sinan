import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import type { RuntimeLodDiagnostics, RuntimeLodGroup, RuntimeScatterGroup } from '../RuntimeTypes';
import {
  ThreeAssetLoader,
  type ThreeModelLoader,
  type ThreeModelLoadResult,
} from './ThreeAssetLoader';
import { ThreeRuntime } from './ThreeRuntime';

const lodGroup: RuntimeLodGroup = {
  strategy: 'distance',
  hysteresis: 1,
  lowEndBias: 1,
  fallbackAsset: 'model.switch_wall.lod2',
  levels: [
    { level: 0, asset: 'model.switch_wall.lod0', minDistance: 0 },
    { level: 1, asset: 'model.switch_wall.lod1', minDistance: 8 },
    { level: 2, asset: 'model.switch_wall.lod2', minDistance: 16 },
  ],
};

const scatterGroup: RuntimeScatterGroup = {
  id: 'scatter_switch_markers',
  source: {
    type: 'asset',
    asset: 'model.switch_wall.lod2',
  },
  count: 6,
  seed: 'gate-demo-switch-markers',
  placement: {
    shape: 'box',
    center: [1.2, 0.7, 6.2],
    size: [2.4, 0, 1.6],
  },
  alignment: 'y-up',
  transform: {
    yaw: {
      min: -0.35,
      max: 0.35,
    },
    uniformScale: {
      min: 0.55,
      max: 0.85,
    },
  },
  quality: {
    lodGroup: 'gate-demo-props',
    lowEndCountScale: 0.5,
  },
  fallback: {
    mode: 'placeholder',
    asset: 'model.switch_wall.lod2',
  },
};

const triangleEstimateByAsset: Record<string, number> = {
  'model.switch_wall.lod0': 24,
  'model.switch_wall.lod1': 12,
  'model.switch_wall.lod2': 12,
};

const demoPerfBudgets = {
  standard: {
    lodTriangles: 12,
    scatterTriangles: 72,
    scatterInstances: 6,
    instancedDrawCalls: 1,
  },
  lowEnd: {
    lodTriangles: 12,
    scatterTriangles: 36,
    scatterInstances: 3,
    instancedDrawCalls: 1,
  },
};

describe('ThreeRuntime LOD scatter perf low-end gate', () => {
  it('records stable local budgets for LOD selection and instanced scatter', async () => {
    const runtime = createRuntime();

    try {
      await loadLodModels(runtime);
      runtime.instantiateModel('model.switch_wall.lod0', 'switch_a');
      runtime.setTransform('switch_a', {
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      });
      setRuntimeCamera(runtime, [0, 0, 9]);
      runtime.setEntityLodGroup('switch_a', lodGroup);
      runtime.setScatterGroups([scatterGroup]);

      expect(runtime.getLodDiagnostics()).toEqual([
        {
          entityId: 'switch_a',
          currentLevel: 1,
          currentAsset: 'model.switch_wall.lod1',
        },
      ]);
      expect(summarizeDemoPerf(runtime)).toEqual({
        lodTriangleEstimate: demoPerfBudgets.standard.lodTriangles,
        scatterTriangleEstimate: demoPerfBudgets.standard.scatterTriangles,
        scatterInstanceCount: demoPerfBudgets.standard.scatterInstances,
        instancedDrawCallEstimate: demoPerfBudgets.standard.instancedDrawCalls,
      });

      runtime.setStyleQualityProfile('low-end');

      expect(runtime.getLodDiagnostics()).toEqual([
        {
          entityId: 'switch_a',
          currentLevel: 2,
          currentAsset: 'model.switch_wall.lod2',
        },
      ]);
      expect(summarizeDemoPerf(runtime)).toEqual({
        lodTriangleEstimate: demoPerfBudgets.lowEnd.lodTriangles,
        scatterTriangleEstimate: demoPerfBudgets.lowEnd.scatterTriangles,
        scatterInstanceCount: demoPerfBudgets.lowEnd.scatterInstances,
        instancedDrawCallEstimate: demoPerfBudgets.lowEnd.instancedDrawCalls,
      });
    } finally {
      runtime.dispose();
    }
  });
});

class FakeModelLoader implements ThreeModelLoader {
  load(url: string): Promise<ThreeModelLoadResult> {
    return Promise.resolve(createLoadResult(url));
  }
}

function createRuntime(): ThreeRuntime {
  return new ThreeRuntime({
    modelAssets: new ThreeAssetLoader(new FakeModelLoader()),
  });
}

async function loadLodModels(runtime: ThreeRuntime): Promise<void> {
  await Promise.all([
    runtime.loadModel('model.switch_wall.lod0', '/models/props/switch_wall_lod0.glb'),
    runtime.loadModel('model.switch_wall.lod1', '/models/props/switch_wall_lod1.glb'),
    runtime.loadModel('model.switch_wall.lod2', '/models/props/switch_wall_lod2.glb'),
  ]);
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
  ).camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  (
    runtime as unknown as {
      camera: THREE.PerspectiveCamera;
    }
  ).camera.position.set(...position);
}

function summarizeDemoPerf(runtime: ThreeRuntime): {
  instancedDrawCallEstimate: number;
  lodTriangleEstimate: number;
  scatterInstanceCount: number;
  scatterTriangleEstimate: number;
} {
  const lod = getSwitchLodDiagnostics(runtime.getLodDiagnostics());
  const scatter = runtime
    .getScatterDiagnostics()
    .find((item) => item.groupId === 'scatter_switch_markers');
  const scatterInstanceCount = scatter?.instanceCount ?? 0;
  const scatterTrianglesPerInstance = scatter?.sourceAsset
    ? (triangleEstimateByAsset[scatter.sourceAsset] ?? 0)
    : 0;
  const lodTriangleEstimate = lod.currentAsset
    ? (triangleEstimateByAsset[lod.currentAsset] ?? 0)
    : 0;

  return {
    lodTriangleEstimate,
    scatterInstanceCount,
    scatterTriangleEstimate: scatterTrianglesPerInstance * scatterInstanceCount,
    instancedDrawCallEstimate: scatter ? 1 : 0,
  };
}

function getSwitchLodDiagnostics(
  diagnostics: readonly RuntimeLodDiagnostics[],
): RuntimeLodDiagnostics {
  const lod = diagnostics.find((item) => item.entityId === 'switch_a');

  if (!lod) {
    throw new Error('Missing switch_a LOD diagnostics.');
  }

  return lod;
}
