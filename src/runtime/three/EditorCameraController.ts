import * as THREE from 'three';

export type EditorCameraDragMode = 'pan' | 'orbit';

export interface EditorCameraWheelInput {
  deltaX: number;
  deltaY: number;
  shiftKey: boolean;
  ctrlKey: boolean;
}

export class EditorCameraController {
  private readonly target = new THREE.Vector3(4, 0.1, 6.2);
  private dragState:
    | {
        mode: EditorCameraDragMode;
        x: number;
        y: number;
      }
    | undefined;

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  reset(): void {
    this.target.set(4, 0.1, 6.2);
    this.camera.position.set(4, 2.6, 0.35);
    this.camera.fov = 64;
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
  }

  syncTarget(lookAt: readonly [number, number, number] | undefined): void {
    if (lookAt) {
      this.target.set(...lookAt);
    }
  }

  handleWheel(input: EditorCameraWheelInput): void {
    if (input.shiftKey) {
      this.panPixels(input.deltaY || input.deltaX, 0);
      return;
    }

    if (input.ctrlKey) {
      this.panPixels(0, input.deltaY);
      return;
    }

    this.dolly(input.deltaY);
  }

  startDrag(mode: EditorCameraDragMode, x: number, y: number): void {
    this.dragState = { mode, x, y };
  }

  updateDrag(x: number, y: number): void {
    if (!this.dragState) {
      return;
    }

    const deltaX = x - this.dragState.x;
    const deltaY = y - this.dragState.y;
    this.dragState.x = x;
    this.dragState.y = y;

    if (this.dragState.mode === 'orbit') {
      this.orbitPixels(deltaX, deltaY);
    } else {
      this.panPixels(deltaX, deltaY);
    }
  }

  endDrag(): void {
    this.dragState = undefined;
  }

  frameObject(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object);
    this.frameBox(box);
  }

  frameObjects(objects: Iterable<THREE.Object3D>): void {
    const box = new THREE.Box3();

    for (const object of objects) {
      box.expandByObject(object);
    }

    this.frameBox(box);
  }

  private frameBox(box: THREE.Box3): void {
    if (box.isEmpty()) {
      this.reset();
      return;
    }

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(0.6, size.length() * 0.5);
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const distance = clampNumber((radius / Math.sin(fov / 2)) * 1.15, 2, 80);
    const direction = this.camera.position.clone().sub(this.target).normalize();

    if (direction.lengthSq() === 0) {
      direction.set(0, 0.35, -1).normalize();
    }

    this.target.copy(center);
    this.camera.position.copy(center).addScaledVector(direction, distance);
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
  }

  private dolly(deltaY: number): void {
    const offset = this.camera.position.clone().sub(this.target);
    const distance = clampNumber(offset.length() * Math.exp(deltaY * 0.0012), 1.25, 120);

    this.camera.position.copy(this.target).addScaledVector(offset.normalize(), distance);
    this.camera.lookAt(this.target);
  }

  private panPixels(deltaX: number, deltaY: number): void {
    const distance = this.camera.position.distanceTo(this.target);
    const scale = Math.max(0.002, distance * 0.0018);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const pan = new THREE.Vector3()
      .addScaledVector(right, -deltaX * scale)
      .addScaledVector(up, deltaY * scale);

    this.camera.position.add(pan);
    this.target.add(pan);
    this.camera.lookAt(this.target);
  }

  private orbitPixels(deltaX: number, deltaY: number): void {
    const offset = this.camera.position.clone().sub(this.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);

    spherical.theta -= deltaX * 0.008;
    spherical.phi = clampNumber(spherical.phi - deltaY * 0.006, 0.12, Math.PI - 0.12);

    this.camera.position.copy(this.target).add(new THREE.Vector3().setFromSpherical(spherical));
    this.camera.lookAt(this.target);
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
