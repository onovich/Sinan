import * as THREE from 'three';

import type { ModelHandle, RuntimeObjectHandle } from '../RuntimeObjectHandle';
import type { PickResult, RuntimeInitOptions, RuntimeSize } from '../RuntimeTypes';
import type { RuntimeTransform } from '../RuntimeTypes';
import type { WebRuntime } from '../WebRuntime';
import { pickThreeObject } from './ThreePicking';

export class ThreeRuntime implements WebRuntime {
  private renderer: THREE.WebGLRenderer | undefined;
  private canvas: HTMLCanvasElement | undefined;
  private scene: THREE.Scene | undefined;
  private objectRoot: THREE.Group | undefined;
  private camera: THREE.PerspectiveCamera | undefined;
  private objectByEntityId = new Map<string, THREE.Object3D>();
  private modelByAssetId = new Map<string, ModelHandle & { url: string }>();
  private width = 1;
  private height = 1;
  private disposed = false;

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
    renderer.setClearColor(0x101418, 1);
    renderer.setPixelRatio(options.pixelRatio ?? window.devicePixelRatio ?? 1);
    renderer.setSize(this.width, this.height, false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101418);
    const objectRoot = new THREE.Group();
    objectRoot.name = 'runtime-objects';
    scene.add(objectRoot);

    const camera = new THREE.PerspectiveCamera(55, this.width / this.height, 0.1, 1000);
    camera.position.set(4.5, 3.8, 6.5);
    camera.lookAt(0, 0.75, 0);

    const grid = new THREE.GridHelper(12, 12, 0x4e6b7d, 0x263642);
    scene.add(grid);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x26313a,
        roughness: 0.78,
        metalness: 0.06,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    scene.add(floor);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0xa7c7ff, 0x1e2a20, 1.9);
    scene.add(fillLight);

    this.renderer = renderer;
    this.scene = scene;
    this.objectRoot = objectRoot;
    this.camera = camera;
  }

  loadModel(assetId: string, url: string): Promise<ModelHandle> {
    const handle = { assetId, url };
    this.modelByAssetId.set(assetId, handle);

    return Promise.resolve({ assetId });
  }

  instantiateModel(assetId: string, entityId: string): RuntimeObjectHandle {
    this.destroyObject(entityId);

    const object = createPlaceholderObject(assetId);
    object.name = entityId;
    tagRuntimeObject(object, entityId, assetId);
    this.objectRoot?.add(object);
    this.objectByEntityId.set(entityId, object);

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
    const object = this.objectByEntityId.get(entityId);
    if (!object) {
      return;
    }

    object.removeFromParent();
    object.traverse((child) => {
      disposeMeshResources(child);
    });
    this.objectByEntityId.delete(entityId);
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

  update(deltaSeconds: number): void {
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
      disposeMeshResources(object);
    });

    this.renderer?.dispose();
    this.renderer = undefined;
    this.canvas = undefined;
    this.scene = undefined;
    this.objectRoot = undefined;
    this.camera = undefined;
    this.objectByEntityId.clear();
    this.modelByAssetId.clear();
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

function disposeMeshResources(object: THREE.Object3D): void {
  if (!(object instanceof THREE.Mesh)) {
    return;
  }

  const mesh = object as THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
  mesh.geometry.dispose();

  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    material.dispose();
  }
}
