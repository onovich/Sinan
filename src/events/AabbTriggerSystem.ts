import {
  AabbColliderComponentSchema,
  TriggerZoneComponentSchema,
  type AabbColliderComponentData,
  type TriggerZoneComponentData,
} from '../schemas/collider.schema';
import type { EntityData } from '../schemas/entity.schema';
import type { TransformData } from '../schemas/transform.schema';
import type { ActionExecutionContext } from './types';
import { TriggerSystem } from './TriggerSystem';

export interface AabbTriggerUpdateResult {
  entered: TriggerOverlapEvent[];
  exited: TriggerOverlapEvent[];
  firedEventIds: string[];
}

export interface TriggerOverlapEvent {
  triggerId: string;
  entityId: string;
}

interface TriggerCandidate {
  entity: EntityData;
  bounds: AabbBounds;
}

interface AabbBounds {
  min: [number, number, number];
  max: [number, number, number];
}

export class AabbTriggerSystem {
  private readonly activeOverlaps = new Set<string>();

  constructor(private readonly triggerSystem: TriggerSystem) {}

  update(
    entities: readonly EntityData[],
    context: ActionExecutionContext,
  ): AabbTriggerUpdateResult {
    const triggers = entities.flatMap((entity) =>
      isTriggerEntity(entity) ? createTriggerCandidate(entity) : [],
    );
    const colliders = entities.flatMap((entity) =>
      isTriggerEntity(entity) ? [] : createTriggerCandidate(entity),
    );
    const nextOverlaps = new Set<string>();
    const entered: TriggerOverlapEvent[] = [];
    const exited: TriggerOverlapEvent[] = [];
    const firedEventIds: string[] = [];

    for (const trigger of triggers) {
      for (const collider of colliders) {
        if (!aabbOverlaps(trigger.bounds, collider.bounds)) {
          continue;
        }

        const key = createOverlapKey(trigger.entity.id, collider.entity.id);
        nextOverlaps.add(key);

        if (!this.activeOverlaps.has(key)) {
          const event = { triggerId: trigger.entity.id, entityId: collider.entity.id };
          entered.push(event);
          firedEventIds.push(
            ...this.triggerSystem.triggerEnter(event.triggerId, event.entityId, context),
          );
        }
      }
    }

    for (const key of this.activeOverlaps) {
      if (nextOverlaps.has(key)) {
        continue;
      }

      const [triggerId, entityId] = key.split('::');
      exited.push({ triggerId, entityId });
      firedEventIds.push(...this.triggerSystem.triggerExit(triggerId, entityId, context));
    }

    this.activeOverlaps.clear();
    for (const key of nextOverlaps) {
      this.activeOverlaps.add(key);
    }

    return { entered, exited, firedEventIds };
  }
}

function createTriggerCandidate(entity: EntityData): TriggerCandidate[] {
  const collider = getAabbCollider(entity);

  if (!collider) {
    return [];
  }

  return [
    {
      entity,
      bounds: createWorldAabb(entity.transform, collider),
    },
  ];
}

function isTriggerEntity(entity: EntityData): boolean {
  const collider = getAabbCollider(entity);

  if (!collider) {
    return false;
  }

  return collider.isTrigger === true || Boolean(getTriggerZone(entity));
}

function getAabbCollider(entity: EntityData): AabbColliderComponentData | undefined {
  const payload = getComponentPayload(entity, 'Collider');
  const result = AabbColliderComponentSchema.safeParse(payload);

  return result.success ? result.data : undefined;
}

function getTriggerZone(entity: EntityData): TriggerZoneComponentData | undefined {
  const payload = getComponentPayload(entity, 'TriggerZone');
  const result = TriggerZoneComponentSchema.safeParse(payload);

  if (!result.success || result.data.enabled === false) {
    return undefined;
  }

  return result.data;
}

function getComponentPayload(entity: EntityData, componentType: string): unknown {
  return entity.components[componentType];
}

function createWorldAabb(
  transform: TransformData,
  collider: AabbColliderComponentData,
): AabbBounds {
  const center: [number, number, number] = [
    transform.position[0] + collider.center[0] * transform.scale[0],
    transform.position[1] + collider.center[1] * transform.scale[1],
    transform.position[2] + collider.center[2] * transform.scale[2],
  ];
  const halfSize: [number, number, number] = [
    Math.abs((collider.size[0] * transform.scale[0]) / 2),
    Math.abs((collider.size[1] * transform.scale[1]) / 2),
    Math.abs((collider.size[2] * transform.scale[2]) / 2),
  ];

  return {
    min: [center[0] - halfSize[0], center[1] - halfSize[1], center[2] - halfSize[2]],
    max: [center[0] + halfSize[0], center[1] + halfSize[1], center[2] + halfSize[2]],
  };
}

function aabbOverlaps(left: AabbBounds, right: AabbBounds): boolean {
  return (
    left.min[0] <= right.max[0] &&
    left.max[0] >= right.min[0] &&
    left.min[1] <= right.max[1] &&
    left.max[1] >= right.min[1] &&
    left.min[2] <= right.max[2] &&
    left.max[2] >= right.min[2]
  );
}

function createOverlapKey(triggerId: string, entityId: string): string {
  return `${triggerId}::${entityId}`;
}
