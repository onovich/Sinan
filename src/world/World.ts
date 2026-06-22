import type { EntityData } from '../schemas/entity.schema';
import type { LevelData } from '../schemas/level.schema';
import { TransformSchema, type TransformData } from '../schemas/transform.schema';
import type { WorldProjectionData } from '../schemas/worldProjection.schema';
import { projectSphericalRegion, type SphericalSurfaceFrame } from './CubeSphereProjection';
import { EntityStore, cloneEntityData, cloneTransform } from './EntityStore';
import {
  deriveSphericalPlacements,
  type SphericalPlacementResult,
  type SphericalPlacementSnapshot,
} from './SphericalPlacement';
import {
  stepSurfaceMovement,
  type SurfaceMovementCommand,
  type SurfaceMovementEdgeStatus,
  type SurfaceMovementOptions,
  type SurfaceMovementState,
} from './SurfaceMovement';
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

export type WorldSurfaceMovementResult =
  | {
      ok: true;
      edgeStatus: SurfaceMovementEdgeStatus;
      entityId: string;
      placement: SphericalPlacementResult;
      state: SurfaceMovementState;
    }
  | {
      ok: false;
      entityId: string;
      message: string;
      reason:
        | 'invalid_input'
        | 'invalid_projection'
        | 'missing_entity'
        | 'missing_placement'
        | 'missing_region'
        | 'missing_world_projection'
        | 'world_unloaded';
    };

export interface SphericalRegionPoint {
  localPosition: TransformData['position'];
  localYaw?: number;
  region: string;
}

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

  getRuntimeTransform(entityId: string): TransformData | undefined {
    const entity = this.entities.getById(entityId);

    if (!entity) {
      return undefined;
    }

    if (entity.placement) {
      const placement = this.getSphericalPlacements().placements.find(
        (candidate) => candidate.entityId === entityId,
      );

      if (placement) {
        return toTransformData(placement.transform);
      }
    }

    return cloneTransform(entity.transform);
  }

  resolveSphericalRegionFrame(point: SphericalRegionPoint): SphericalSurfaceFrame | undefined {
    if (!this.worldProjection) {
      return undefined;
    }

    const region = this.worldProjection.regions.find((candidate) => candidate.id === point.region);

    if (!region) {
      return undefined;
    }

    try {
      return projectSphericalRegion({
        localPosition: [...point.localPosition],
        localYaw: point.localYaw ?? 0,
        radius: this.worldProjection.radius,
        region,
      });
    } catch {
      return undefined;
    }
  }

  getSphericalPlacements(): SphericalPlacementSnapshot {
    return deriveSphericalPlacements({
      entities: this.entities.list(),
      levelId: this.levelId,
      worldProjection: this.worldProjection,
    });
  }

  stepSphericalMovement(
    entityId: string,
    command: SurfaceMovementCommand,
    options?: SurfaceMovementOptions,
  ): WorldSurfaceMovementResult {
    if (!this.worldProjection) {
      return {
        ok: false,
        entityId,
        message: `World level "${this.levelId}" has no worldProjection.`,
        reason: 'missing_world_projection',
      };
    }

    const entity = this.entities.getById(entityId);

    if (!entity) {
      return {
        ok: false,
        entityId,
        message: `World entity "${entityId}" does not exist.`,
        reason: 'missing_entity',
      };
    }

    if (!entity.placement) {
      return {
        ok: false,
        entityId,
        message: `World entity "${entityId}" does not define spherical placement.`,
        reason: 'missing_placement',
      };
    }

    const movement = stepSurfaceMovement({
      command,
      options,
      projection: this.worldProjection,
      state: {
        headingRadians: entity.placement.localYaw ?? 0,
        localPosition: entity.placement.localPosition ?? entity.transform.position,
        regionId: entity.placement.region,
      },
    });

    if (!movement.ok) {
      return {
        ok: false,
        entityId,
        message: movement.message,
        reason: movement.reason,
      };
    }

    this.entities.setPlacement(entityId, {
      ...entity.placement,
      localPosition: movement.state.localPosition,
      localYaw: movement.state.headingRadians,
    });

    const placement = this.getSphericalPlacements().placements.find(
      (candidate) => candidate.entityId === entityId,
    );

    if (!placement) {
      return {
        ok: false,
        entityId,
        message: `Failed to derive spherical placement for moved entity "${entityId}".`,
        reason: 'invalid_projection',
      };
    }

    return {
      ok: true,
      edgeStatus: movement.edgeStatus,
      entityId,
      placement,
      state: movement.state,
    };
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

function toTransformData(transform: {
  position: readonly [number, number, number];
  rotation: readonly [number, number, number, number];
  scale: readonly [number, number, number];
}): TransformData {
  return {
    position: [...transform.position],
    rotation: [...transform.rotation],
    scale: [...transform.scale],
  };
}
