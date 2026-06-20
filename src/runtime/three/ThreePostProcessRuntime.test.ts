import * as THREE from 'three';
import type { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { describe, expect, it, vi } from 'vitest';

import { ThreePostProcessRuntime } from './ThreePostProcessRuntime';

describe('ThreePostProcessRuntime', () => {
  it('initializes render and output passes behind an EffectComposer boundary', () => {
    const composer = createComposerProbe();
    const renderPass = createPassProbe();
    const outputPass = createPassProbe();
    const runtime = new ThreePostProcessRuntime({
      composerFactory: () => composer.composer,
      outputPassFactory: () => outputPass.pass,
      renderPassFactory: () => renderPass.pass,
    });

    runtime.init(createContext({ enabled: true, pixelRatio: 2 }));

    expect(runtime.hasComposer()).toBe(true);
    expect(composer.addPass).toHaveBeenCalledWith(renderPass.pass);
    expect(composer.addPass).toHaveBeenCalledWith(outputPass.pass);
    expect(composer.setPixelRatio).toHaveBeenCalledWith(2);
    expect(composer.setSize).toHaveBeenCalledWith(320, 180);
  });

  it('routes render through composer when enabled and fallback when disabled', () => {
    const composer = createComposerProbe();
    const runtime = new ThreePostProcessRuntime({
      composerFactory: () => composer.composer,
      outputPassFactory: () => createPassProbe().pass,
      renderPassFactory: () => createPassProbe().pass,
    });
    const fallbackRender = vi.fn();

    runtime.init(createContext({ enabled: false }));
    runtime.render(fallbackRender);

    expect(fallbackRender).toHaveBeenCalledTimes(1);
    expect(composer.render).not.toHaveBeenCalled();

    runtime.init(createContext({ enabled: true }));
    runtime.render(fallbackRender);

    expect(fallbackRender).toHaveBeenCalledTimes(1);
    expect(composer.render).toHaveBeenCalledTimes(1);
  });

  it('resizes and disposes composer resources only when initialized', () => {
    const composer = createComposerProbe();
    const renderPass = createPassProbe();
    const outputPass = createPassProbe();
    const runtime = new ThreePostProcessRuntime({
      composerFactory: () => composer.composer,
      outputPassFactory: () => outputPass.pass,
      renderPassFactory: () => renderPass.pass,
    });

    runtime.resize({ height: 64, pixelRatio: 1, width: 64 });
    runtime.dispose();

    expect(composer.setSize).not.toHaveBeenCalled();
    expect(composer.dispose).not.toHaveBeenCalled();

    runtime.init(createContext({ enabled: true }));
    runtime.resize({ height: 256, pixelRatio: 1.5, width: 512 });
    runtime.dispose();

    expect(composer.setPixelRatio).toHaveBeenLastCalledWith(1.5);
    expect(composer.setSize).toHaveBeenLastCalledWith(512, 256);
    expect(renderPass.dispose).toHaveBeenCalledTimes(1);
    expect(outputPass.dispose).toHaveBeenCalledTimes(1);
    expect(composer.dispose).toHaveBeenCalledTimes(1);
    expect(runtime.hasComposer()).toBe(false);
  });
});

function createContext(options: { enabled: boolean; pixelRatio?: number }) {
  return {
    camera: new THREE.PerspectiveCamera(),
    enabled: options.enabled,
    height: 180,
    pixelRatio: options.pixelRatio,
    renderer: {} as THREE.WebGLRenderer,
    scene: new THREE.Scene(),
    width: 320,
  };
}

function createComposerProbe() {
  const addPass = vi.fn();
  const dispose = vi.fn();
  const render = vi.fn();
  const setPixelRatio = vi.fn();
  const setSize = vi.fn();

  return {
    addPass,
    composer: {
      addPass,
      dispose,
      render,
      setPixelRatio,
      setSize,
    },
    dispose,
    render,
    setPixelRatio,
    setSize,
  };
}

function createPassProbe() {
  const dispose = vi.fn();

  return {
    dispose,
    pass: {
      dispose,
    } as unknown as Pass,
  };
}
