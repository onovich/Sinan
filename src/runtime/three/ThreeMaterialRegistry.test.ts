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
      palette: 'missing_world',
      tone: 'accent',
    });

    expect(result).toEqual({
      profile: 'standard',
      styledMeshCount: 1,
      fallbackUsed: true,
    });
    expect(warnings).toEqual([
      'Render style profile "palette-toon" could not find palette "missing_world"; using standard material fallback.',
    ]);
  });

  it('applies a palette-toon material from named palette tones', () => {
    const root = new THREE.Group();
    const original = new THREE.MeshStandardMaterial({ color: 0x76b28b });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), original);
    root.add(mesh);

    const result = new ThreeMaterialRegistry({
      resources: {
        palettes: {
          world_01: {
            id: 'world_01',
            tones: {
              accent: '#5aa7d6',
            },
          },
        },
      },
    }).applyStyle(root, {
      profile: 'palette-toon',
      palette: 'world_01',
      tone: 'accent',
    });

    expect(result).toEqual({
      profile: 'palette-toon',
      styledMeshCount: 1,
      fallbackUsed: false,
    });
    const material = expectMeshToonMaterial(mesh.material);
    expect(material.color.getHexString()).toBe('5aa7d6');
    expect(mesh.userData.sinanRenderStyleProfile).toBe('palette-toon');
  });

  it('uses a lighter palette material in low-end quality mode', () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x76b28b }),
    );
    root.add(mesh);

    const registry = new ThreeMaterialRegistry({
      qualityProfile: 'low-end',
      resources: {
        palettes: {
          world_01: {
            id: 'world_01',
            tones: {
              accent: '#5aa7d6',
            },
          },
        },
      },
    });

    registry.applyStyle(root, {
      profile: 'palette-toon',
      palette: 'world_01',
      tone: 'accent',
    });

    const material = expectMeshBasicMaterial(mesh.material);
    expect(material.color.getHexString()).toBe('5aa7d6');
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

  it('disposes previous styled materials when palette-toon style changes', () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x76b28b }),
    );
    const registry = new ThreeMaterialRegistry({
      resources: {
        palettes: {
          world_01: {
            id: 'world_01',
            tones: {
              accent: '#5aa7d6',
              warm: '#d6a15a',
            },
          },
        },
      },
    });
    root.add(mesh);

    registry.applyStyle(root, {
      profile: 'palette-toon',
      palette: 'world_01',
      tone: 'accent',
    });
    const firstStyledMaterial = mesh.material as THREE.Material;
    const firstDispose = vi.spyOn(firstStyledMaterial, 'dispose');
    registry.applyStyle(root, {
      profile: 'palette-toon',
      palette: 'world_01',
      tone: 'warm',
    });

    expect(firstDispose).toHaveBeenCalledTimes(1);
    expect(expectMeshToonMaterial(mesh.material).color.getHexString()).toBe('d6a15a');
  });
});

function expectMeshToonMaterial(
  material: THREE.Material | THREE.Material[],
): THREE.MeshToonMaterial {
  expect(material).toBeInstanceOf(THREE.MeshToonMaterial);

  if (!(material instanceof THREE.MeshToonMaterial)) {
    throw new Error('Expected a MeshToonMaterial.');
  }

  return material;
}

function expectMeshBasicMaterial(
  material: THREE.Material | THREE.Material[],
): THREE.MeshBasicMaterial {
  expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);

  if (!(material instanceof THREE.MeshBasicMaterial)) {
    throw new Error('Expected a MeshBasicMaterial.');
  }

  return material;
}
