import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import type { RuntimeScatterGroup } from '../RuntimeTypes';
import {
  ThreeAssetLoader,
  type ThreeModelLoader,
  type ThreeModelLoadResult,
} from './ThreeAssetLoader';
import { ThreeRuntime } from './ThreeRuntime';

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
    uniformScale: {
      min: 0.55,
      max: 0.85,
    },
  },
  quality: {
    lowEndCountScale: 0.5,
  },
  fallback: {
    mode: 'placeholder',
    asset: 'model.switch_wall.lod2',
  },
};

describe('ThreeRuntime InstancedMesh scatter', () => {
  it('renders scatter groups as InstancedMesh with deterministic matrices', async () => {
    const runtime = createRuntime();

    await runtime.loadModel('model.switch_wall.lod2', '/models/props/switch_wall_lod2.glb');
    runtime.setScatterGroups([scatterGroup]);

    const mesh = getScatterMesh(runtime, scatterGroup.id);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    mesh.getMatrixAt(0, matrix);
    matrix.decompose(position, rotation, scale);

    expect(mesh).toBeInstanceOf(THREE.InstancedMesh);
    expect(mesh.count).toBe(6);
    expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(position.x).toBeGreaterThanOrEqual(0);
    expect(position.x).toBeLessThanOrEqual(2.4);
    expect(position.y).toBeCloseTo(0.7);
    expect(position.z).toBeGreaterThanOrEqual(5.4);
    expect(position.z).toBeLessThanOrEqual(7);
    expect(scale.x).toBeGreaterThanOrEqual(0.55);
    expect(scale.x).toBeLessThanOrEqual(0.85);
    expect(runtime.getScatterDiagnostics()).toEqual([
      {
        groupId: 'scatter_switch_markers',
        instanceCount: 6,
        sourceAsset: 'model.switch_wall.lod2',
        fallbackUsed: false,
      },
    ]);
  });

  it('skips empty scatter groups', async () => {
    const runtime = createRuntime();

    await runtime.loadModel('model.switch_wall.lod2', '/models/props/switch_wall_lod2.glb');
    runtime.setScatterGroups([{ ...scatterGroup, count: 0 }]);

    expect(runtime.getScatterDiagnostics()).toEqual([]);
    expect(getScatterMesh(runtime, scatterGroup.id, { optional: true })).toBeUndefined();
  });

  it('uses the declared fallback asset when the scatter source is unavailable', async () => {
    const runtime = createRuntime();

    await runtime.loadModel('model.switch_wall.lod2', '/models/props/switch_wall_lod2.glb');
    runtime.setScatterGroups([
      {
        ...scatterGroup,
        source: {
          type: 'asset',
          asset: 'model.missing',
        },
      },
    ]);

    expect(runtime.getScatterDiagnostics()).toEqual([
      {
        groupId: 'scatter_switch_markers',
        instanceCount: 6,
        sourceAsset: 'model.switch_wall.lod2',
        fallbackUsed: true,
      },
    ]);
  });

  it('applies low-end scatter count bias', async () => {
    const runtime = createRuntime();

    await runtime.loadModel('model.switch_wall.lod2', '/models/props/switch_wall_lod2.glb');
    runtime.setStyleQualityProfile('low-end');
    runtime.setScatterGroups([scatterGroup]);

    expect(runtime.getScatterDiagnostics()).toEqual([
      {
        groupId: 'scatter_switch_markers',
        instanceCount: 3,
        sourceAsset: 'model.switch_wall.lod2',
        fallbackUsed: false,
      },
    ]);
    expect(getScatterMesh(runtime, scatterGroup.id).count).toBe(3);
  });

  it('disposes instanced geometry and material resources', async () => {
    const runtime = createRuntime();
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose');

    try {
      await runtime.loadModel('model.switch_wall.lod2', '/models/props/switch_wall_lod2.glb');
      runtime.setScatterGroups([scatterGroup]);
      runtime.setScatterGroups([]);

      expect(geometryDispose).toHaveBeenCalled();
      expect(materialDispose).toHaveBeenCalled();
      expect(runtime.getScatterDiagnostics()).toEqual([]);
    } finally {
      runtime.dispose();
      geometryDispose.mockRestore();
      materialDispose.mockRestore();
    }
  });
});

class FakeModelLoader implements ThreeModelLoader {
  load(): Promise<ThreeModelLoadResult> {
    const scene = new THREE.Group();
    scene.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x5aa7d6 }),
      ),
    );

    return Promise.resolve({ scene, animations: [] });
  }
}

function createRuntime(): ThreeRuntime {
  return new ThreeRuntime({
    modelAssets: new ThreeAssetLoader(new FakeModelLoader()),
  });
}

function getScatterMesh(runtime: ThreeRuntime, groupId: string): THREE.InstancedMesh;
function getScatterMesh(
  runtime: ThreeRuntime,
  groupId: string,
  options: { optional: true },
): THREE.InstancedMesh | undefined;
function getScatterMesh(
  runtime: ThreeRuntime,
  groupId: string,
  options: { optional?: boolean } = {},
): THREE.InstancedMesh | undefined {
  const scatterRuntime = (
    runtime as unknown as {
      scatterRuntime: {
        meshByGroupId: Map<string, { mesh: THREE.InstancedMesh }>;
      };
    }
  ).scatterRuntime;
  const mesh = scatterRuntime.meshByGroupId.get(groupId)?.mesh;

  if (!mesh && options.optional !== true) {
    throw new Error(`Missing scatter mesh "${groupId}".`);
  }

  return mesh;
}
