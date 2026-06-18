import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

import type { ModelHandle, RuntimeObjectHandle } from '../RuntimeObjectHandle';
import type {
  PickResult,
  RuntimeAnimationPlayOptions,
  RuntimeAnimationStopOptions,
  RuntimeAnimationTimeOptions,
  RuntimeCameraPose,
  RuntimeDebugAabb,
  RuntimeRenderEnvironmentStyle,
  RuntimeRenderStyle,
  RuntimeInitOptions,
  RuntimeSize,
  RuntimeStyleQualityProfile,
  RuntimeStyleResources,
  TransformGizmoCallbacks,
  TransformGizmoMode,
} from '../RuntimeTypes';
import type { RuntimeTransform } from '../RuntimeTypes';
import type { WebRuntime } from '../WebRuntime';
import {
  cloneLoadedModelScene,
  ThreeAssetLoader,
  type ThreeLoadedModelAsset,
} from './ThreeAssetLoader';
import {
  EditorCameraController,
  type EditorCameraDragMode,
  type EditorCameraWheelInput,
} from './EditorCameraController';
import { disposeObjectResources } from './ThreeObjectResources';
import { pickThreeObject } from './ThreePicking';

export interface ThreeRuntimeOptions {
  modelAssets?: ThreeAssetLoader;
  logger?: Pick<Console, 'warn'>;
}

interface EntityAnimationBinding {
  mixer: THREE.AnimationMixer;
  clipsByName: Map<string, THREE.AnimationClip>;
  actionsByClip: Map<string, THREE.AnimationAction>;
  activeClips: Set<string>;
}

export class ThreeRuntime implements WebRuntime {
  private readonly modelAssets: ThreeAssetLoader;
  private readonly logger: Pick<Console, 'warn'>;
  private renderer: THREE.WebGLRenderer | undefined;
  private canvas: HTMLCanvasElement | undefined;
  private scene: THREE.Scene | undefined;
  private objectRoot: THREE.Group | undefined;
  private camera: THREE.PerspectiveCamera | undefined;
  private editorCamera: EditorCameraController | undefined;
  private transformControls: TransformControls | undefined;
  private transformControlsHelper: THREE.Object3D | undefined;
  private transformGizmoEntityId: string | undefined;
  private transformGizmoCallbacks: TransformGizmoCallbacks | undefined;
  private objectByEntityId = new Map<string, THREE.Object3D>();
  private debugAabbByEntityId = new Map<string, THREE.LineSegments>();
  private animationStateByEntityId = new Map<
    string,
    { clip: string; loop?: boolean; playing: boolean; time: number }
  >();
  private animationBindingByEntityId = new Map<string, EntityAnimationBinding>();
  private styleResources: RuntimeStyleResources = { palettes: {} };
  private renderStyleByEntityId = new Map<string, RuntimeRenderStyle>();
  private renderEnvironment: RuntimeRenderEnvironmentStyle | undefined;
  private styleQualityProfile: RuntimeStyleQualityProfile = 'standard';
  private selectedEntityId: string | undefined;
  private width = 1;
  private height = 1;
  private disposed = false;

  constructor(options: ThreeRuntimeOptions = {}) {
    this.modelAssets = options.modelAssets ?? new ThreeAssetLoader();
    this.logger = options.logger ?? console;
  }

  init(options: RuntimeInitOptions): void {
    this.canvas = options.canvas;
    this.width = Math.max(1, Math.floor(options.width));
    this.height = Math.max(1, Math.floor(options.height));
    this.disposed = false;

    const renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x0f1517, 1);
    renderer.setPixelRatio(options.pixelRatio ?? window.devicePixelRatio ?? 1);
    renderer.setSize(this.width, this.height, false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1517);
    const objectRoot = new THREE.Group();
    objectRoot.name = 'runtime-objects';
    scene.add(objectRoot);

    const camera = new THREE.PerspectiveCamera(64, this.width / this.height, 0.1, 1000);
    camera.position.set(4, 2.6, 0.35);
    camera.lookAt(4, 0.1, 6.2);
    const editorCamera = new EditorCameraController(camera);

    const grid = new THREE.GridHelper(18, 18, 0x668091, 0x263842);
    scene.add(grid);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshStandardMaterial({
        color: 0x1f2b31,
        roughness: 0.82,
        metalness: 0.06,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.position.z = 4;
    scene.add(floor);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.55);
    keyLight.position.set(3, 8, 2);
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0xa7c7ff, 0x203024, 1.75);
    scene.add(fillLight);

    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.enabled = false;
    const transformControlsHelper = transformControls.getHelper();
    transformControlsHelper.visible = false;
    transformControls.addEventListener('objectChange', () => {
      this.emitTransformGizmoChange('onChange');
    });
    transformControls.addEventListener('mouseUp', () => {
      this.emitTransformGizmoChange('onCommit');
    });
    scene.add(transformControlsHelper);

    this.renderer = renderer;
    this.scene = scene;
    this.objectRoot = objectRoot;
    this.camera = camera;
    this.editorCamera = editorCamera;
    this.transformControls = transformControls;
    this.transformControlsHelper = transformControlsHelper;
  }

  async loadModel(assetId: string, url: string): Promise<ModelHandle> {
    try {
      await this.modelAssets.loadModel(assetId, url);
    } catch (error) {
      this.logger.warn(
        `GLB asset "${assetId}" failed to load from "${url}"; using placeholder fallback.`,
        error,
      );
    }

    return { assetId };
  }

  instantiateModel(assetId: string, entityId: string): RuntimeObjectHandle {
    this.destroyObject(entityId);

    const loadedAsset = this.modelAssets.getLoadedModel(assetId);
    const object = loadedAsset
      ? cloneLoadedModelScene(loadedAsset)
      : createPlaceholderObject(assetId);
    object.name = entityId;
    tagRuntimeObject(object, entityId, assetId);
    this.objectRoot?.add(object);
    this.objectByEntityId.set(entityId, object);
    this.bindEntityAnimations(entityId, object, loadedAsset);

    return { entityId, runtimeObjectId: entityId };
  }

  createEmpty(entityId: string): RuntimeObjectHandle {
    this.destroyObject(entityId);

    const object = createEmptyObject();
    object.name = entityId;
    tagRuntimeObject(object, entityId);
    this.objectRoot?.add(object);
    this.objectByEntityId.set(entityId, object);

    return { entityId, runtimeObjectId: entityId };
  }

  destroyObject(entityId: string): void {
    if (this.transformGizmoEntityId === entityId) {
      this.detachTransformGizmo();
    }

    this.disposeDebugAabb(entityId);
    this.disposeEntityAnimations(entityId);
    this.renderStyleByEntityId.delete(entityId);
    if (this.selectedEntityId === entityId) {
      this.selectedEntityId = undefined;
    }

    const object = this.objectByEntityId.get(entityId);
    if (!object) {
      return;
    }

    object.removeFromParent();
    object.traverse((child) => {
      disposeObjectResources(child);
    });
    this.objectByEntityId.delete(entityId);
    this.animationStateByEntityId.delete(entityId);
  }

  setTransform(entityId: string, transform: RuntimeTransform): void {
    const object = this.objectByEntityId.get(entityId);
    if (!object) {
      return;
    }

    object.position.set(...transform.position);
    object.quaternion.set(...transform.rotation);
    object.scale.set(...transform.scale);
  }

  getTransform(entityId: string): RuntimeTransform | null {
    const object = this.objectByEntityId.get(entityId);
    if (!object) {
      return null;
    }

    return {
      position: [object.position.x, object.position.y, object.position.z],
      rotation: [
        object.quaternion.x,
        object.quaternion.y,
        object.quaternion.z,
        object.quaternion.w,
      ],
      scale: [object.scale.x, object.scale.y, object.scale.z],
    };
  }

  setVisible(entityId: string, visible: boolean): void {
    const object = this.objectByEntityId.get(entityId);
    if (object) {
      object.visible = visible;
    }
  }

  playAnimation(options: RuntimeAnimationPlayOptions): void {
    const binding = this.animationBindingByEntityId.get(options.entityId);

    if (binding) {
      const clipAction = this.getClipAction(binding, options.clip);

      if (clipAction) {
        for (const activeClip of binding.activeClips) {
          if (activeClip !== options.clip) {
            this.stopClipAction(binding, activeClip, options.fadeOut);
          }
        }

        const { action } = clipAction;
        action.reset();
        action.enabled = true;
        action.paused = false;
        action.clampWhenFinished = options.loop !== true;
        action.timeScale = options.timeScale ?? 1;
        action.setLoop(
          options.loop === true ? THREE.LoopRepeat : THREE.LoopOnce,
          options.loop ? Infinity : 1,
        );
        if (options.fadeIn && options.fadeIn > 0) {
          action.fadeIn(options.fadeIn);
        }
        action.play();
        binding.activeClips.add(options.clip);
      } else {
        this.warnMissingAnimationClip(options.entityId, options.clip);
      }
    }

    this.animationStateByEntityId.set(options.entityId, {
      clip: options.clip,
      loop: options.loop,
      playing: true,
      time: 0,
    });
  }

  stopAnimation(options: RuntimeAnimationStopOptions): void {
    const binding = this.animationBindingByEntityId.get(options.entityId);

    if (binding) {
      if (options.clip) {
        this.stopClipAction(binding, options.clip, options.fadeOut);
      } else {
        for (const clipName of binding.activeClips) {
          this.stopClipAction(binding, clipName, options.fadeOut);
        }
      }
    }

    const current = this.animationStateByEntityId.get(options.entityId);

    if (!current || (options.clip && current.clip !== options.clip)) {
      return;
    }

    this.animationStateByEntityId.set(options.entityId, { ...current, playing: false });
  }

  setAnimationTime(options: RuntimeAnimationTimeOptions): void {
    const time = Math.max(0, options.time);
    const binding = this.animationBindingByEntityId.get(options.entityId);

    if (binding) {
      const clipAction = this.getClipAction(binding, options.clip);

      if (clipAction) {
        binding.mixer.stopAllAction();
        binding.activeClips.clear();
        const { action, clip } = clipAction;
        action.reset();
        action.enabled = true;
        action.paused = false;
        action.clampWhenFinished = true;
        action.setLoop(THREE.LoopOnce, 1);
        action.play();
        binding.mixer.setTime(Math.min(time, clip.duration));
        action.paused = true;
        binding.activeClips.add(options.clip);
      } else {
        this.warnMissingAnimationClip(options.entityId, options.clip);
      }
    }

    const current = this.animationStateByEntityId.get(options.entityId);

    this.animationStateByEntityId.set(options.entityId, {
      clip: options.clip,
      loop: current?.loop,
      playing: false,
      time,
    });
  }

  setCameraPose(pose: RuntimeCameraPose): void {
    if (!this.camera) {
      return;
    }

    this.camera.position.set(...pose.position);

    if (pose.lookAt) {
      this.camera.lookAt(...pose.lookAt);
      this.editorCamera?.syncTarget(pose.lookAt);
    } else if (pose.rotation) {
      this.camera.quaternion.set(...pose.rotation);
    }

    this.camera.fov = pose.fov;
    if (pose.near !== undefined) {
      this.camera.near = pose.near;
    }
    if (pose.far !== undefined) {
      this.camera.far = pose.far;
    }
    this.camera.updateProjectionMatrix();
  }

  setDebugAabb(entityId: string, bounds: RuntimeDebugAabb | undefined): void {
    this.disposeDebugAabb(entityId);

    if (!bounds?.visible || !this.scene) {
      return;
    }

    const sourceGeometry = new THREE.BoxGeometry(...bounds.size);
    const geometry = new THREE.EdgesGeometry(sourceGeometry);
    sourceGeometry.dispose();

    const material = new THREE.LineBasicMaterial({
      color: bounds.color ?? '#f4bd4e',
      depthWrite: false,
      transparent: true,
      opacity: 0.95,
    });
    const line = new THREE.LineSegments(geometry, material);
    line.name = `${entityId}:debug-aabb`;
    line.position.set(...bounds.center);
    line.userData = {
      entityId,
      debugKind: 'trigger-aabb',
    };

    this.scene.add(line);
    this.debugAabbByEntityId.set(entityId, line);
  }

  setStyleResources(resources: RuntimeStyleResources): void {
    this.styleResources = resources;
  }

  setRenderStyle(entityId: string, style: RuntimeRenderStyle | undefined): void {
    if (style) {
      this.renderStyleByEntityId.set(entityId, style);
    } else {
      this.renderStyleByEntityId.delete(entityId);
    }
  }

  setRenderEnvironment(environment: RuntimeRenderEnvironmentStyle | undefined): void {
    this.renderEnvironment = environment;
  }

  setStyleQualityProfile(profile: RuntimeStyleQualityProfile): void {
    this.styleQualityProfile = profile;
  }

  setSelectedEntity(entityId: string | undefined): void {
    this.selectedEntityId = entityId;
  }

  pick(clientX: number, clientY: number): PickResult | null {
    if (!this.canvas || !this.camera || !this.objectRoot) {
      return null;
    }

    return pickThreeObject({
      canvas: this.canvas,
      camera: this.camera,
      root: this.objectRoot,
      clientX,
      clientY,
    });
  }

  attachTransformGizmo(entityId: string, callbacks?: TransformGizmoCallbacks): void {
    const object = this.objectByEntityId.get(entityId);

    if (!object || !this.transformControls) {
      return;
    }

    this.transformGizmoEntityId = entityId;
    this.transformGizmoCallbacks = callbacks;
    this.transformControls.attach(object);
    if (this.transformControlsHelper) {
      this.transformControlsHelper.visible = true;
    }
    this.transformControls.enabled = true;
  }

  detachTransformGizmo(): void {
    this.transformControls?.detach();
    if (this.transformControlsHelper) {
      this.transformControlsHelper.visible = false;
    }
    if (this.transformControls) {
      this.transformControls.enabled = false;
    }
    this.transformGizmoEntityId = undefined;
    this.transformGizmoCallbacks = undefined;
  }

  setTransformGizmoMode(mode: TransformGizmoMode): void {
    this.transformControls?.setMode(mode);
  }

  handleEditorCameraWheel(input: EditorCameraWheelInput): void {
    this.editorCamera?.handleWheel(input);
  }

  startEditorCameraDrag(mode: EditorCameraDragMode, clientX: number, clientY: number): void {
    this.editorCamera?.startDrag(mode, clientX, clientY);
  }

  updateEditorCameraDrag(clientX: number, clientY: number): void {
    this.editorCamera?.updateDrag(clientX, clientY);
  }

  endEditorCameraDrag(): void {
    this.editorCamera?.endDrag();
  }

  frameEntity(entityId: string): void {
    const object = this.objectByEntityId.get(entityId);

    if (object) {
      this.editorCamera?.frameObject(object);
    }
  }

  frameAll(): void {
    this.editorCamera?.frameObjects(this.objectByEntityId.values());
  }

  resetEditorCamera(): void {
    this.editorCamera?.reset();
  }

  update(deltaSeconds: number): void {
    for (const binding of this.animationBindingByEntityId.values()) {
      binding.mixer.update(deltaSeconds);
    }

    for (const [entityId, animation] of this.animationStateByEntityId) {
      if (animation.playing) {
        this.animationStateByEntityId.set(entityId, {
          ...animation,
          time: animation.time + deltaSeconds,
        });
      }
    }

    for (const object of this.objectByEntityId.values()) {
      if (object.userData.assetId === 'model.player_spawn') {
        object.rotation.y += deltaSeconds * 0.8;
      }
    }
  }

  render(): void {
    if (!this.renderer || !this.scene || !this.camera) {
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }

  resize(size: RuntimeSize): void {
    if (!this.renderer || !this.camera) {
      return;
    }

    this.width = Math.max(1, Math.floor(size.width));
    this.height = Math.max(1, Math.floor(size.height));
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(size.pixelRatio ?? window.devicePixelRatio ?? 1);
    this.renderer.setSize(this.width, this.height, false);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.scene?.traverse((object) => {
      disposeObjectResources(object);
    });

    this.renderer?.dispose();
    this.transformControls?.dispose();
    this.renderer = undefined;
    this.canvas = undefined;
    this.scene = undefined;
    this.objectRoot = undefined;
    this.camera = undefined;
    this.editorCamera = undefined;
    this.transformControls = undefined;
    this.transformControlsHelper = undefined;
    this.transformGizmoEntityId = undefined;
    this.transformGizmoCallbacks = undefined;
    this.objectByEntityId.clear();
    this.debugAabbByEntityId.clear();
    this.renderStyleByEntityId.clear();
    this.modelAssets.dispose();
    this.animationStateByEntityId.clear();
    this.animationBindingByEntityId.clear();
    this.styleResources = { palettes: {} };
    this.renderEnvironment = undefined;
    this.styleQualityProfile = 'standard';
    this.selectedEntityId = undefined;
  }

  private disposeDebugAabb(entityId: string): void {
    const line = this.debugAabbByEntityId.get(entityId);
    if (!line) {
      return;
    }

    line.removeFromParent();
    disposeObjectResources(line);
    this.debugAabbByEntityId.delete(entityId);
  }

  private emitTransformGizmoChange(callbackName: keyof TransformGizmoCallbacks): void {
    const entityId = this.transformGizmoEntityId;
    const callback = this.transformGizmoCallbacks?.[callbackName];

    if (!entityId || !callback) {
      return;
    }

    const transform = this.getTransform(entityId);

    if (!transform) {
      return;
    }

    callback({ entityId, transform });
  }

  private bindEntityAnimations(
    entityId: string,
    object: THREE.Object3D,
    loadedAsset: ThreeLoadedModelAsset | undefined,
  ): void {
    if (!loadedAsset || loadedAsset.animations.length === 0) {
      return;
    }

    this.animationBindingByEntityId.set(entityId, {
      mixer: new THREE.AnimationMixer(object),
      clipsByName: new Map(loadedAsset.animations.map((clip) => [clip.name, clip])),
      actionsByClip: new Map(),
      activeClips: new Set(),
    });
  }

  private disposeEntityAnimations(entityId: string): void {
    const binding = this.animationBindingByEntityId.get(entityId);

    if (!binding) {
      return;
    }

    binding.mixer.stopAllAction();
    binding.actionsByClip.clear();
    binding.activeClips.clear();
    this.animationBindingByEntityId.delete(entityId);
  }

  private getClipAction(
    binding: EntityAnimationBinding,
    clipName: string,
  ): { clip: THREE.AnimationClip; action: THREE.AnimationAction } | undefined {
    const clip = binding.clipsByName.get(clipName);

    if (!clip) {
      return undefined;
    }

    const cachedAction = binding.actionsByClip.get(clipName);
    if (cachedAction) {
      return { clip, action: cachedAction };
    }

    const action = binding.mixer.clipAction(clip);
    binding.actionsByClip.set(clipName, action);

    return { clip, action };
  }

  private stopClipAction(
    binding: EntityAnimationBinding,
    clipName: string,
    fadeOut: number | undefined,
  ): void {
    const clipAction = this.getClipAction(binding, clipName);

    if (!clipAction) {
      return;
    }

    if (fadeOut && fadeOut > 0) {
      clipAction.action.fadeOut(fadeOut);
    } else {
      clipAction.action.stop();
    }
    binding.activeClips.delete(clipName);
  }

  private warnMissingAnimationClip(entityId: string, clipName: string): void {
    this.logger.warn(`Animation clip "${clipName}" was not found for entity "${entityId}".`);
  }
}

function tagRuntimeObject(object: THREE.Object3D, entityId: string, assetId?: string): void {
  object.traverse((child) => {
    child.userData = {
      ...child.userData,
      entityId,
      assetId,
    };
  });
}

function createPlaceholderObject(assetId: string): THREE.Object3D {
  if (assetId.includes('switch')) {
    return createBoxObject(0x5aa7d6, [0.45, 0.45, 0.18], [0, 0.55, 0]);
  }

  if (assetId.includes('door') || assetId.includes('gate')) {
    return createBoxObject(0x9f7b52, [1.2, 2.2, 0.28], [0, 1.1, 0]);
  }

  if (assetId.includes('spawn')) {
    const group = new THREE.Group();
    const marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.85, 24),
      new THREE.MeshStandardMaterial({ color: 0x76b28b, roughness: 0.42 }),
    );
    marker.position.y = 0.42;
    group.add(marker);

    return group;
  }

  return createBoxObject(0x76b28b, [1, 1, 1], [0, 0.5, 0]);
}

function createEmptyObject(): THREE.Object3D {
  const group = new THREE.Group();
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xd6c75a, roughness: 0.5 }),
  );
  marker.position.y = 0.2;
  group.add(marker);

  return group;
}

function createBoxObject(
  color: THREE.ColorRepresentation,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
): THREE.Object3D {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.08 }),
  );
  mesh.position.set(...position);
  group.add(mesh);

  return group;
}
