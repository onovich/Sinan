import type { EntityData } from '../schemas/entity.schema';
import type { LevelData } from '../schemas/level.schema';
import { TransformSchema, type TransformData } from '../schemas/transform.schema';
import { EntityStore, cloneEntityData, cloneTransform } from './EntityStore';
import type { WorldSnapshot } from './WorldSnapshot';

export type WorldTransformResult =
  | {
      ok: true;
      entityId: string;
      transform: TransformData;
    }
  | {
      ok: false;
      entityId: string;
      message: string;
      reason: 'missing_entity' | 'invalid_transform';
    };

export class World {
  private readonly entities: EntityStore;

  private constructor(
    private readonly levelId: string,
    entities: readonly EntityData[],
  ) {
    this.entities = new EntityStore(entities);
  }

  static fromLevel(level: LevelData): World {
    return new World(level.id, level.entities);
  }

  getEntity(entityId: string): EntityData | undefined {
    return this.entities.getById(entityId);
  }

  getEntityIds(): string[] {
    return this.entities.list().map((entity) => entity.id);
  }

  getTransform(entityId: string): TransformData | undefined {
    return this.entities.getTransform(entityId);
  }

  setTransform(entityId: string, transform: unknown): WorldTransformResult {
    if (!this.entities.has(entityId)) {
      return {
        ok: false,
        entityId,
        message: `World entity "${entityId}" does not exist.`,
        reason: 'missing_entity',
      };
    }

    const result = TransformSchema.safeParse(transform);

    if (!result.success) {
      return {
        ok: false,
        entityId,
        message: `Invalid transform for world entity "${entityId}".`,
        reason: 'invalid_transform',
      };
    }

    this.entities.setTransform(entityId, result.data);

    return {
      ok: true,
      entityId,
      transform: cloneTransform(result.data),
    };
  }

  snapshot(): WorldSnapshot {
    const entities = this.entities.list();

    return {
      entityCount: entities.length,
      entities: entities.map((entity) => ({
        componentTypes: Object.keys(entity.components).sort(),
        id: entity.id,
        name: entity.name,
        prefab: entity.prefab,
        transform: cloneTransform(entity.transform),
      })),
      levelId: this.levelId,
    };
  }

  toEntityData(): EntityData[] {
    return this.entities.list().map(cloneEntityData);
  }
}
