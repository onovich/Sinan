import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import { ThreeMaterialRegistry } from './ThreeMaterialRegistry';

describe('ThreeMaterialRegistry', () => {
  it('applies the standard profile to meshes while ignoring helper lines', () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x76b28b }),
    );
    const helper = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial(),
    );
    root.add(mesh, helper);

    const result = new ThreeMaterialRegistry().applyStyle(root, { profile: 'standard' });

    expect(result).toEqual({
      profile: 'standard',
      styledMeshCount: 1,
      fallbackUsed: false,
    });
    expect(mesh.userData.sinanRenderStyleProfile).toBe('standard');
    expect(helper.userData.sinanRenderStyleProfile).toBeUndefined();
  });

  it('falls back to standard for unimplemented profiles with a warning', () => {
    const warnings: string[] = [];
    const root = new THREE.Group();
    root.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x76b28b }),
      ),
    );

    const result = new ThreeMaterialRegistry({
      logger: {
        warn: (message: unknown) => warnings.push(String(message)),
      },
    }).applyStyle(root, {
      profile: 'palette-toon',
      palette: 'world_01',
      tone: 'accent',
    });

    expect(result).toEqual({
      profile: 'standard',
      styledMeshCount: 1,
      fallbackUsed: true,
    });
    expect(warnings).toEqual([
      'Render style profile "palette-toon" is not implemented yet; using standard material fallback.',
    ]);
  });

  it('restores original materials and disposes replaced material resources', () => {
    const root = new THREE.Group();
    const original = new THREE.MeshStandardMaterial({ color: 0x76b28b });
    const replacement = new THREE.MeshStandardMaterial({ color: 0x5aa7d6 });
    const replacementDispose = vi.spyOn(replacement, 'dispose');
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), original);
    const registry = new ThreeMaterialRegistry();
    root.add(mesh);

    registry.applyStyle(root, { profile: 'standard' });
    mesh.material = replacement;
    registry.applyStyle(root, { profile: 'standard' });

    expect(mesh.material).toBe(original);
    expect(replacementDispose).toHaveBeenCalledTimes(1);
  });
});
