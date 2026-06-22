import * as THREE from 'three';

import {
  cloneDeliveryRouteFeedbackState,
  createEmptyDeliveryRouteFeedbackState,
} from '../DeliveryRouteFeedbackState';
import type {
  RuntimeDeliveryRouteFeedbackDiagnostics,
  RuntimeDeliveryRouteFeedbackMarker,
  RuntimeDeliveryRouteFeedbackMarkerDiagnostics,
  RuntimeDeliveryRouteFeedbackState,
  RuntimeStyleQualityProfile,
  Vec3,
} from '../RuntimeTypes';
import { disposeObjectTree } from './ThreeObjectResources';

interface MarkerVisualBinding {
  marker: RuntimeDeliveryRouteFeedbackMarker;
  object: THREE.Object3D;
}

const markerOffsetByKind: Record<RuntimeDeliveryRouteFeedbackMarker['kind'], number> = {
  accept: 0.42,
  completion: 0.48,
  route: 0.34,
  target: 0.5,
};

export class ThreeDeliveryRouteFeedbackRuntime {
  private readonly group = new THREE.Group();
  private readonly markerById = new Map<string, MarkerVisualBinding>();
  private root: THREE.Object3D | undefined;
  private state: RuntimeDeliveryRouteFeedbackState = createEmptyDeliveryRouteFeedbackState();
  private qualityProfile: RuntimeStyleQualityProfile = 'standard';
  private lowEndSuppressedCount = 0;

  constructor() {
    this.group.name = 'delivery-route-feedback';
  }

  setRoot(root: THREE.Object3D | undefined): void {
    this.root = root;

    if (!root) {
      this.group.removeFromParent();
      return;
    }

    if (!this.group.parent) {
      root.add(this.group);
    }
  }

  setQualityProfile(profile: RuntimeStyleQualityProfile): void {
    this.qualityProfile = profile;
    this.rebuild();
  }

  setState(state: RuntimeDeliveryRouteFeedbackState): void {
    this.state = cloneDeliveryRouteFeedbackState(state);
    this.rebuild();
  }

  getDiagnostics(): RuntimeDeliveryRouteFeedbackDiagnostics {
    const markers = Array.from(this.markerById.values(), ({ marker }) =>
      createMarkerDiagnostics(marker),
    );

    return {
      activeMarkerCount: markers.filter((marker) => marker.active).length,
      completedMarkerCount: markers.filter((marker) => marker.completed).length,
      issueCount: this.state.issueCount,
      issues: this.state.issues.map((issue) => ({ ...issue })),
      lowEndSuppressedCount: this.lowEndSuppressedCount,
      markerCount: this.state.markerCount,
      markers,
      missingTargetCount: this.state.issues.filter(
        (issue) => issue.reason === 'missing_target_endpoint',
      ).length,
      visibleMarkerCount: markers.length,
    };
  }

  dispose(): void {
    this.clearMarkers();
    this.group.removeFromParent();
    this.state = createEmptyDeliveryRouteFeedbackState();
    this.lowEndSuppressedCount = 0;
  }

  private rebuild(): void {
    this.clearMarkers();
    this.lowEndSuppressedCount = 0;

    for (const marker of this.state.markers) {
      if (!marker.visible || !marker.position) {
        continue;
      }

      if (this.shouldSuppressMarker(marker)) {
        this.lowEndSuppressedCount += 1;
        continue;
      }

      const object = createMarkerObject(marker);
      this.group.add(object);
      this.markerById.set(marker.id, {
        marker,
        object,
      });
    }

    if (this.root && !this.group.parent) {
      this.root.add(this.group);
    }
  }

  private clearMarkers(): void {
    for (const binding of this.markerById.values()) {
      binding.object.removeFromParent();
      disposeObjectTree(binding.object);
    }

    this.markerById.clear();
    this.group.clear();
  }

  private shouldSuppressMarker(marker: RuntimeDeliveryRouteFeedbackMarker): boolean {
    return this.qualityProfile === 'low-end' && marker.kind === 'route' && !marker.target;
  }
}

function createMarkerObject(marker: RuntimeDeliveryRouteFeedbackMarker): THREE.Object3D {
  const root = new THREE.Group();
  const material = createMarkerMaterial(marker);
  const primary = createPrimaryMarkerMesh(marker, material);
  const halo = createHalo(marker);

  root.name = `delivery-route:${marker.id}`;
  root.userData = {
    active: marker.active,
    completed: marker.completed,
    deliveryRouteFeedbackMarkerId: marker.id,
    fallbackUsed: marker.fallbackUsed,
    kind: marker.kind,
    status: marker.status,
    target: marker.target,
  };
  root.add(halo);
  root.add(primary);

  const normal = marker.normal ?? ([0, 1, 0] as const);
  const position = offsetPosition(marker.position as Vec3, normal, markerOffsetByKind[marker.kind]);
  root.position.set(...position);

  if (marker.kind === 'target' || marker.kind === 'completion') {
    root.rotation.x = Math.PI / 2;
  }

  return root;
}

function createPrimaryMarkerMesh(
  marker: RuntimeDeliveryRouteFeedbackMarker,
  material: THREE.Material,
): THREE.Mesh {
  if (marker.kind === 'target' || marker.kind === 'completion') {
    return new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 8, 32), material);
  }

  if (marker.kind === 'accept') {
    return new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), material);
  }

  return new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 8), material);
}

function createHalo(marker: RuntimeDeliveryRouteFeedbackMarker): THREE.Mesh {
  const opacity = marker.active ? 0.42 : marker.completed ? 0.36 : 0.22;
  const scale = marker.kind === 'route' ? 0.44 : 0.68;
  const material = new THREE.MeshBasicMaterial({
    color: getMarkerColor(marker),
    depthWrite: false,
    opacity,
    transparent: true,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(scale, 32), material);

  mesh.name = `delivery-route-halo:${marker.id}`;

  return mesh;
}

function createMarkerMaterial(marker: RuntimeDeliveryRouteFeedbackMarker): THREE.Material {
  return new THREE.MeshBasicMaterial({
    color: getMarkerColor(marker),
    depthTest: true,
    depthWrite: false,
    opacity: marker.active || marker.completed ? 0.96 : 0.64,
    transparent: true,
  });
}

function getMarkerColor(marker: RuntimeDeliveryRouteFeedbackMarker): number {
  if (marker.completed) {
    return 0x76b28b;
  }

  if (marker.status === 'blocked') {
    return 0x9f7b52;
  }

  if (marker.kind === 'target' || marker.kind === 'completion') {
    return 0xffcf70;
  }

  if (marker.kind === 'accept') {
    return 0x5aa7d6;
  }

  return 0xd9eadf;
}

function createMarkerDiagnostics(
  marker: RuntimeDeliveryRouteFeedbackMarker,
): RuntimeDeliveryRouteFeedbackMarkerDiagnostics {
  return {
    active: marker.active,
    completed: marker.completed,
    fallbackUsed: marker.fallbackUsed,
    id: marker.id,
    kind: marker.kind,
    ...(marker.position ? { position: [...marker.position] as Vec3 } : {}),
    status: marker.status,
    target: marker.target,
    visible: marker.visible,
  };
}

function offsetPosition(position: Vec3, normal: Vec3, offset: number): Vec3 {
  return [
    position[0] + normal[0] * offset,
    position[1] + normal[1] * offset,
    position[2] + normal[2] * offset,
  ];
}
