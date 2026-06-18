import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import { applyThreeEnvironmentStyle, type ThreeEnvironmentRenderer } from './ThreeEnvironmentStyle';

describe('applyThreeEnvironmentStyle', () => {
  it('applies background, ambient light, fog, exposure, and saturation', () => {
    const scene = new THREE.Scene();
    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x000000, 0);
    const helperRoot = new THREE.Group();
    const helper = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xffffff, fog: true }),
    );
    helperRoot.add(helper);
    const renderer = createRenderer();

    applyThreeEnvironmentStyle(
      {
        scene,
        renderer,
        ambientLight,
        helperRoots: [helperRoot],
      },
      {
        background: '#111111',
        ambientLight: 0.35,
        fog: {
          enabled: true,
          color: '#162024',
          near: 8,
          far: 18,
        },
        colorGrade: {
          enabled: true,
          exposure: 1.05,
          saturation: 1.08,
        },
      },
    );

    expect((scene.background as THREE.Color).getHexString()).toBe('111111');
    expect(renderer.setClearColor).toHaveBeenCalledWith('#111111', 1);
    expect(ambientLight.intensity).toBeCloseTo(1.75);
    expect(scene.fog).toBeInstanceOf(THREE.Fog);
    expect((scene.fog as THREE.Fog).color.getHexString()).toBe('162024');
    expect((scene.fog as THREE.Fog).near).toBe(8);
    expect((scene.fog as THREE.Fog).far).toBe(18);
    expect(renderer.toneMappingExposure).toBe(1.05);
    expect(renderer.domElement?.style?.filter).toBe('brightness(1.05) saturate(1.08)');
    expect((helper.material as THREE.LineBasicMaterial).fog).toBe(false);
  });

  it('clears fog and color grade when controls are disabled or missing', () => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#ffffff', 1, 2);
    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x000000, 4);
    const renderer = createRenderer();
    renderer.toneMappingExposure = 1.6;
    renderer.domElement.style.filter = 'brightness(1.6) saturate(1.2)';

    applyThreeEnvironmentStyle(
      {
        scene,
        renderer,
        ambientLight,
      },
      {
        fog: {
          enabled: false,
        },
        colorGrade: {
          enabled: false,
        },
      },
    );

    expect((scene.background as THREE.Color).getHexString()).toBe('0f1517');
    expect(renderer.setClearColor).toHaveBeenCalledWith('#0f1517', 1);
    expect(ambientLight.intensity).toBeCloseTo(1.75);
    expect(scene.fog).toBeNull();
    expect(renderer.toneMappingExposure).toBe(1);
    expect(renderer.domElement.style.filter).toBe('');
  });
});

function createRenderer() {
  return {
    domElement: {
      style: {
        filter: '',
      },
    },
    setClearColor: vi.fn<(color: THREE.ColorRepresentation, alpha?: number) => void>(),
    toneMappingExposure: 1,
  } satisfies ThreeEnvironmentRenderer;
}
