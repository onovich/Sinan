import * as THREE from 'three';

import type { RuntimeInitOptions, RuntimeSize } from '../RuntimeTypes';
import type { WebRuntime } from '../WebRuntime';

export class ThreeRuntime implements WebRuntime {
  private renderer: THREE.WebGLRenderer | undefined;
  private scene: THREE.Scene | undefined;
  private camera: THREE.PerspectiveCamera | undefined;
  private demoMesh: THREE.Mesh | undefined;
  private width = 1;
  private height = 1;
  private disposed = false;

  init(options: RuntimeInitOptions): void {
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

    const demoMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 1.35, 1.35),
      new THREE.MeshStandardMaterial({
        color: 0x76b28b,
        roughness: 0.44,
        metalness: 0.12,
      }),
    );
    demoMesh.position.set(0, 0.68, 0);
    scene.add(demoMesh);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0xa7c7ff, 0x1e2a20, 1.9);
    scene.add(fillLight);

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.demoMesh = demoMesh;
  }

  update(deltaSeconds: number): void {
    if (!this.demoMesh) {
      return;
    }

    this.demoMesh.rotation.y += deltaSeconds * 0.42;
    this.demoMesh.rotation.x = Math.sin(performance.now() * 0.0008) * 0.08;
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
    this.scene = undefined;
    this.camera = undefined;
    this.demoMesh = undefined;
  }
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
