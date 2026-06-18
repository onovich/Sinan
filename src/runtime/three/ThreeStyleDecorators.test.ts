import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import { ThreeStyleDecorators } from './ThreeStyleDecorators';

describe('ThreeStyleDecorators', () => {
  it('creates helpers for interactable outline styles', () => {
    const helperRoot = new THREE.Group();
    const decorators = new ThreeStyleDecorators(helperRoot);

    decorators.syncEntity('switch_a', createBox(), {
      profile: 'palette-toon',
      outline: 'interactable',
    });

    expect(helperRoot.children).toHaveLength(1);
    expect(helperRoot.children[0]?.name).toBe('switch_a:style-helper');
    expect(helperRoot.children[0]?.userData).toMatchObject({
      entityId: 'switch_a',
      helperKind: 'render-style',
    });
  });

  it('updates selected highlight helpers when selection changes', () => {
    const helperRoot = new THREE.Group();
    const decorators = new ThreeStyleDecorators(helperRoot);
    decorators.syncEntity('gate_a', createBox(), {
      profile: 'palette-toon',
      highlight: 'selected',
    });

    expect(helperRoot.children).toHaveLength(0);

    decorators.setSelectedEntity('gate_a');

    expect(helperRoot.children).toHaveLength(1);
    expect(helperColor(helperRoot.children[0] as THREE.BoxHelper)).toBe('f4d35e');

    decorators.setSelectedEntity('switch_a');

    expect(helperRoot.children).toHaveLength(0);
  });

  it('removes helpers and disposes resources when an entity is removed', () => {
    const helperRoot = new THREE.Group();
    const decorators = new ThreeStyleDecorators(helperRoot);
    decorators.syncEntity('switch_a', createBox(), {
      profile: 'palette-toon',
      outline: 'always',
    });
    const helper = helperRoot.children[0] as THREE.BoxHelper;
    const geometryDispose = vi.spyOn(helper.geometry, 'dispose');
    const material = helper.material as THREE.Material;
    const materialDispose = vi.spyOn(material, 'dispose');

    decorators.removeEntity('switch_a');

    expect(helperRoot.children).toHaveLength(0);
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
  });

  it('disables outline and highlight helpers in low-end quality mode', () => {
    const helperRoot = new THREE.Group();
    const decorators = new ThreeStyleDecorators(helperRoot);
    decorators.syncEntity('switch_a', createBox(), {
      profile: 'palette-toon',
      outline: 'always',
    });

    expect(helperRoot.children).toHaveLength(1);

    decorators.setQualityProfile('low-end');

    expect(helperRoot.children).toHaveLength(0);

    decorators.setQualityProfile('standard');

    expect(helperRoot.children).toHaveLength(1);
  });
});

function createBox(): THREE.Object3D {
  return new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x76b28b }),
  );
}

function helperColor(helper: THREE.BoxHelper): string {
  const material = helper.material;

  if (!(material instanceof THREE.LineBasicMaterial)) {
    throw new Error('Expected a LineBasicMaterial.');
  }

  return material.color.getHexString();
}
