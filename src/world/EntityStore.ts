import type { EntityData } from '../schemas/entity.schema';
import type { TransformData } from '../schemas/transform.schema';
import type { EntityPlacementData } from '../schemas/worldProjection.schema';

export class EntityStore {
  private readonly entitiesById = new Map<string, EntityData>();

  constructor(entities: readonly EntityData[]) {
    for (const entity of entities) {
      this.entitiesById.set(entity.id, cloneEntityData(entity));
    }
  }

  getById(entityId: string): EntityData | undefined {
    const entity = this.entitiesById.get(entityId);

    return entity ? cloneEntityData(entity) : undefined;
  }

  getTransform(entityId: string): TransformData | undefined {
    const entity = this.entitiesById.get(entityId);

    return entity ? cloneTransform(entity.transform) : undefined;
  }

  has(entityId: string): boolean {
    return this.entitiesById.has(entityId);
  }

  list(): EntityData[] {
    return [...this.entitiesById.values()].map(cloneEntityData);
  }

  setTransform(entityId: string, transform: TransformData): boolean {
    const entity = this.entitiesById.get(entityId);

    if (!entity) {
      return false;
    }

    entity.transform = cloneTransform(transform);

    return true;
  }

  setPlacement(entityId: string, placement: EntityPlacementData): boolean {
    const entity = this.entitiesById.get(entityId);

    if (!entity) {
      return false;
    }

    entity.placement = cloneJsonData(placement);

    return true;
  }
}

export function cloneEntityData(entity: EntityData): EntityData {
  return {
    ...entity,
    ...(entity.placement ? { placement: cloneJsonData(entity.placement) } : {}),
    transform: cloneTransform(entity.transform),
    components: cloneJsonData(entity.components),
  };
}

export function cloneTransform(transform: TransformData): TransformData {
  return {
    position: [...transform.position],
    rotation: [...transform.rotation],
    scale: [...transform.scale],
  };
}

function cloneJsonData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
