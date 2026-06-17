import * as THREE from 'three';

type RenderableObject = (THREE.Mesh | THREE.LineSegments) & {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
};

export function cloneRenderableResources(root: THREE.Object3D): void {
  root.traverse((object) => {
    const renderable = getRenderableObject(object);

    if (!renderable) {
      return;
    }

    renderable.geometry = renderable.geometry.clone();
    renderable.material = cloneMaterialSet(renderable.material);
  });
}

export function disposeObjectTree(root: THREE.Object3D): void {
  root.traverse((object) => {
    disposeObjectResources(object);
  });
}

export function disposeObjectResources(object: THREE.Object3D): void {
  const renderable = getRenderableObject(object);

  if (!renderable) {
    return;
  }

  renderable.geometry.dispose();

  const materials = Array.isArray(renderable.material)
    ? renderable.material
    : [renderable.material];
  for (const material of materials) {
    material.dispose();
  }
}

function cloneMaterialSet(
  material: THREE.Material | THREE.Material[],
): THREE.Material | THREE.Material[] {
  if (Array.isArray(material)) {
    return material.map((entry) => entry.clone());
  }

  return material.clone();
}

function getRenderableObject(object: THREE.Object3D): RenderableObject | undefined {
  if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.LineSegments)) {
    return undefined;
  }

  return object as RenderableObject;
}
