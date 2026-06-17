import type { EntityData } from '../schemas/entity.schema';
import type { PrefabData } from '../schemas/prefab.schema';

export interface ProjectPrefabLookup {
  prefabs: Record<string, PrefabData>;
}

export function getRenderableModelAssetId(
  project: ProjectPrefabLookup,
  entity: EntityData,
): string | undefined {
  const entityRenderable = getComponentPayload(entity.components, 'Renderable');
  const entityModel = getStringProperty(entityRenderable, 'model');

  if (entityModel) {
    return entityModel;
  }

  const prefab = getEntityPrefab(project, entity);
  const prefabRenderable = getComponentPayload(prefab?.components, 'Renderable');
  const prefabModel = getStringProperty(prefabRenderable, 'model');

  return prefabModel ?? prefab?.model;
}

export function getEntityPrefab(
  project: ProjectPrefabLookup,
  entity: EntityData,
): PrefabData | undefined {
  if (!entity.prefab) {
    return undefined;
  }

  return project.prefabs[entity.prefab];
}

export function getComponentPayload(
  components: Record<string, unknown> | undefined,
  componentType: string,
): Record<string, unknown> | undefined {
  const payload = components?.[componentType];

  return isRecord(payload) ? payload : undefined;
}

export function getStringProperty(
  payload: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = payload?.[key];

  return typeof value === 'string' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
