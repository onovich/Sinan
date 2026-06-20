import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

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

export interface ThreePostProcessVignetteSettings {
  enabled: boolean;
  intensity?: number;
  softness?: number;
}

type VignettePass = Pass & {
  enabled: boolean;
  uniforms?: {
    uIntensity?: THREE.IUniform<number>;
    uSoftness?: THREE.IUniform<number>;
  };
};

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
  vignettePassFactory?: () => VignettePass;
}

export class ThreePostProcessRuntime {
  private composer: EffectComposerLike | undefined;
  private outputPass: Pass | undefined;
  private renderPass: Pass | undefined;
  private vignettePass: VignettePass | undefined;
  private vignetteSettings: Required<ThreePostProcessVignetteSettings> = {
    enabled: false,
    intensity: 0.35,
    softness: 0.45,
  };

  constructor(private readonly options: ThreePostProcessRuntimeOptions = {}) {}

  init(context: ThreePostProcessContext): void {
    this.dispose();

    if (context.enabled !== true) {
      return;
    }

    const composer = this.createComposer(context.renderer);
    const renderPass = this.createRenderPass(context.scene, context.camera);
    const vignettePass = this.createVignettePass();
    const outputPass = this.createOutputPass();
    this.applyVignetteSettings(vignettePass);

    composer.addPass(renderPass);
    composer.addPass(vignettePass);
    composer.addPass(outputPass);
    composer.setPixelRatio?.(context.pixelRatio ?? 1);
    composer.setSize(context.width, context.height);

    this.composer = composer;
    this.renderPass = renderPass;
    this.vignettePass = vignettePass;
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

  setVignette(settings: ThreePostProcessVignetteSettings): void {
    this.vignetteSettings = normalizeVignetteSettings(settings);
    this.applyVignetteSettings(this.vignettePass);
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
    this.vignettePass?.dispose?.();
    this.outputPass?.dispose?.();
    this.composer?.dispose();
    this.renderPass = undefined;
    this.vignettePass = undefined;
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

  private createVignettePass(): VignettePass {
    const pass = this.options.vignettePassFactory?.() ?? new ShaderPass(THREE_VIGNETTE_SHADER);

    return pass;
  }

  private applyVignetteSettings(pass: VignettePass | undefined): void {
    if (!pass) {
      return;
    }

    pass.enabled = this.vignetteSettings.enabled && this.vignetteSettings.intensity > 0;
    if (pass.uniforms?.uIntensity) {
      pass.uniforms.uIntensity.value = this.vignetteSettings.intensity;
    }
    if (pass.uniforms?.uSoftness) {
      pass.uniforms.uSoftness.value = this.vignetteSettings.softness;
    }
  }
}

function normalizeVignetteSettings(
  settings: ThreePostProcessVignetteSettings,
): Required<ThreePostProcessVignetteSettings> {
  return {
    enabled: settings.enabled,
    intensity: clampFinite(settings.intensity ?? 0.35, 0, 1),
    softness: clampFinite(settings.softness ?? 0.45, 0.05, 0.95),
  };
}

function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

const THREE_VIGNETTE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uIntensity: { value: 0.35 },
    uSoftness: { value: 0.45 },
  },
  vertexShader: `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
  fragmentShader: `
uniform sampler2D tDiffuse;
uniform float uIntensity;
uniform float uSoftness;

varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  float distanceFromCenter = distance(vUv, vec2(0.5));
  float edgeAmount = smoothstep(uSoftness, 0.82, distanceFromCenter);
  color.rgb *= 1.0 - edgeAmount * uIntensity;
  gl_FragColor = color;
}
`,
};
