import type { EntityData } from '../schemas/entity.schema';
import type { LevelData } from '../schemas/level.schema';
import { TransformSchema, type TransformData } from '../schemas/transform.schema';
import type { WorldProjectionData } from '../schemas/worldProjection.schema';
import { EntityStore, cloneEntityData, cloneTransform } from './EntityStore';
import { deriveSphericalPlacements, type SphericalPlacementSnapshot } from './SphericalPlacement';
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
  private readonly worldProjection: WorldProjectionData | undefined;

  private constructor(
    private readonly levelId: string,
    worldProjection: LevelData['worldProjection'],
    entities: readonly EntityData[],
  ) {
    this.entities = new EntityStore(entities);
    this.worldProjection = worldProjection ? cloneJsonData(worldProjection) : undefined;
  }

  static fromLevel(level: LevelData): World {
    return new World(level.id, level.worldProjection, level.entities);
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

  getSphericalPlacements(): SphericalPlacementSnapshot {
    return deriveSphericalPlacements({
      entities: this.entities.list(),
      levelId: this.levelId,
      worldProjection: this.worldProjection,
    });
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

function cloneJsonData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
