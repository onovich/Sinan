import * as THREE from 'three';

import type { PickResult } from '../RuntimeTypes';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

export interface ThreePickInput {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  root: THREE.Object3D;
  clientX: number;
  clientY: number;
}

export function pickThreeObject(input: ThreePickInput): PickResult | null {
  const rect = input.canvas.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  pointer.x = ((input.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((input.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, input.camera);

  const intersections = raycaster.intersectObjects(input.root.children, true);

  for (const intersection of intersections) {
    const entityId = findEntityId(intersection.object);

    if (entityId) {
      return {
        entityId,
        point: [intersection.point.x, intersection.point.y, intersection.point.z],
      };
    }
  }

  return null;
}

function findEntityId(object: THREE.Object3D): string | undefined {
  let current: THREE.Object3D | null = object;

  while (current) {
    const entityId = getEntityId(current.userData);

    if (typeof entityId === 'string') {
      return entityId;
    }

    current = current.parent;
  }

  return undefined;
}

function getEntityId(userData: unknown): unknown {
  if (typeof userData !== 'object' || userData === null || Array.isArray(userData)) {
    return undefined;
  }

  return (userData as Record<string, unknown>).entityId;
}
