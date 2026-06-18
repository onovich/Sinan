import * as THREE from 'three';

import type { RuntimeRenderStyle } from '../RuntimeTypes';
import { disposeObjectResources } from './ThreeObjectResources';

const outlineColor = '#10232b';
const highlightColor = '#f4d35e';

interface EntityStyleEntry {
  object: THREE.Object3D;
  style: RuntimeRenderStyle | undefined;
}

export class ThreeStyleDecorators {
  private readonly entries = new Map<string, EntityStyleEntry>();
  private readonly helperByEntityId = new Map<string, THREE.BoxHelper>();
  private selectedEntityId: string | undefined;

  constructor(private readonly helperRoot: THREE.Object3D) {}

  setSelectedEntity(entityId: string | undefined): void {
    this.selectedEntityId = entityId;
    for (const [entryEntityId, entry] of this.entries) {
      this.syncHelper(entryEntityId, entry);
    }
  }

  syncEntity(
    entityId: string,
    object: THREE.Object3D,
    style: RuntimeRenderStyle | undefined,
  ): void {
    const entry = { object, style };
    this.entries.set(entityId, entry);
    this.syncHelper(entityId, entry);
  }

  removeEntity(entityId: string): void {
    this.entries.delete(entityId);
    this.disposeHelper(entityId);
    if (this.selectedEntityId === entityId) {
      this.selectedEntityId = undefined;
    }
  }

  update(): void {
    for (const helper of this.helperByEntityId.values()) {
      helper.update();
    }
  }

  dispose(): void {
    for (const entityId of this.helperByEntityId.keys()) {
      this.disposeHelper(entityId);
    }
    this.entries.clear();
    this.selectedEntityId = undefined;
  }

  private syncHelper(entityId: string, entry: EntityStyleEntry): void {
    const color = this.getHelperColor(entityId, entry.style);

    if (!color) {
      this.disposeHelper(entityId);
      return;
    }

    let helper = this.helperByEntityId.get(entityId);
    if (!helper) {
      helper = new THREE.BoxHelper(entry.object, color);
      helper.name = `${entityId}:style-helper`;
      helper.userData = {
        entityId,
        helperKind: 'render-style',
      };
      this.helperByEntityId.set(entityId, helper);
      this.helperRoot.add(helper);
    } else {
      helper.setFromObject(entry.object);
      setHelperColor(helper, color);
    }
  }

  private getHelperColor(
    entityId: string,
    style: RuntimeRenderStyle | undefined,
  ): string | undefined {
    if (!style) {
      return undefined;
    }

    const selected = this.selectedEntityId === entityId;
    if (isModeActive(style.highlight, selected)) {
      return highlightColor;
    }

    if (isModeActive(style.outline, selected)) {
      return outlineColor;
    }

    return undefined;
  }

  private disposeHelper(entityId: string): void {
    const helper = this.helperByEntityId.get(entityId);
    if (!helper) {
      return;
    }

    helper.removeFromParent();
    disposeObjectResources(helper);
    this.helperByEntityId.delete(entityId);
  }
}

function isModeActive(mode: RuntimeRenderStyle['outline'], selected: boolean): boolean {
  if (mode === 'always' || mode === 'interactable') {
    return true;
  }

  return mode === 'selected' && selected;
}

function setHelperColor(helper: THREE.BoxHelper, color: string): void {
  const material = helper.material;

  if (Array.isArray(material)) {
    for (const entry of material) {
      if (entry instanceof THREE.LineBasicMaterial) {
        entry.color.set(color);
      }
    }
    return;
  }

  if (material instanceof THREE.LineBasicMaterial) {
    material.color.set(color);
  }
}
