import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

export interface ThreePostProcessContext {
  camera: THREE.Camera;
  enabled?: boolean;
  height: number;
  pixelRatio?: number;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  width: number;
}

export interface ThreePostProcessSize {
  height: number;
  pixelRatio?: number;
  width: number;
}

interface EffectComposerLike {
  addPass: (pass: Pass) => void;
  dispose: () => void;
  render: () => void;
  setPixelRatio?: (pixelRatio: number) => void;
  setSize: (width: number, height: number) => void;
}

export interface ThreePostProcessRuntimeOptions {
  composerFactory?: (renderer: THREE.WebGLRenderer) => EffectComposerLike;
  outputPassFactory?: () => Pass;
  renderPassFactory?: (scene: THREE.Scene, camera: THREE.Camera) => Pass;
}

export class ThreePostProcessRuntime {
  private composer: EffectComposerLike | undefined;
  private outputPass: Pass | undefined;
  private renderPass: Pass | undefined;

  constructor(private readonly options: ThreePostProcessRuntimeOptions = {}) {}

  init(context: ThreePostProcessContext): void {
    this.dispose();

    if (context.enabled !== true) {
      return;
    }

    const composer = this.createComposer(context.renderer);
    const renderPass = this.createRenderPass(context.scene, context.camera);
    const outputPass = this.createOutputPass();

    composer.addPass(renderPass);
    composer.addPass(outputPass);
    composer.setPixelRatio?.(context.pixelRatio ?? 1);
    composer.setSize(context.width, context.height);

    this.composer = composer;
    this.renderPass = renderPass;
    this.outputPass = outputPass;
  }

  hasComposer(): boolean {
    return this.composer !== undefined;
  }

  render(fallbackRender: () => void): void {
    if (this.composer) {
      this.composer.render();
      return;
    }

    fallbackRender();
  }

  resize(size: ThreePostProcessSize): void {
    if (!this.composer) {
      return;
    }

    this.composer.setPixelRatio?.(size.pixelRatio ?? 1);
    this.composer.setSize(size.width, size.height);
  }

  dispose(): void {
    this.renderPass?.dispose?.();
    this.outputPass?.dispose?.();
    this.composer?.dispose();
    this.renderPass = undefined;
    this.outputPass = undefined;
    this.composer = undefined;
  }

  private createComposer(renderer: THREE.WebGLRenderer): EffectComposerLike {
    return this.options.composerFactory?.(renderer) ?? new EffectComposer(renderer);
  }

  private createRenderPass(scene: THREE.Scene, camera: THREE.Camera): Pass {
    return this.options.renderPassFactory?.(scene, camera) ?? new RenderPass(scene, camera);
  }

  private createOutputPass(): Pass {
    return this.options.outputPassFactory?.() ?? new OutputPass();
  }
}
