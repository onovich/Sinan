import {
  DeliveryEndpointComponentSchema,
  InteractableComponentSchema,
} from '../../schemas/component.schema';
import type { DeliveryEndpointIdData } from '../../schemas/delivery.schema';
import type { EntityData } from '../../schemas/entity.schema';
import type { TransformData } from '../../schemas/transform.schema';
import type { World } from '../../world';

export type InteractionCandidateKind = 'deliveryEndpoint' | 'interactable';
export type InteractionPositionSource = 'authored' | 'authored-fallback' | 'spherical';
export type InteractionSolverIssueReason =
  | 'invalid_delivery_endpoint'
  | 'invalid_interactable'
  | 'missing_candidate_transform';
export type InteractionSolverFailureReason = 'missing_actor' | 'missing_actor_transform';

export interface InteractionSolverIssue {
  entityId: string;
  message: string;
  reason: InteractionSolverIssueReason;
}

export interface InteractionCandidate {
  deliveryEndpoint?: {
    endpointId: DeliveryEndpointIdData;
    kind: 'mailbox' | 'npc';
    label: string;
  };
  distance: number;
  entityId: string;
  kind: InteractionCandidateKind;
  position: TransformData['position'];
  positionSource: InteractionPositionSource;
  prompt?: string;
  radius: number;
}

export interface InteractionSolverOptions {
  defaultInteractableRadius?: number;
  includeActor?: boolean;
  maxDistance?: number;
}

export type InteractionSolverResult =
  | {
      actor: {
        entityId: string;
        position: TransformData['position'];
        positionSource: InteractionPositionSource;
      };
      candidates: InteractionCandidate[];
      issues: InteractionSolverIssue[];
      nearest?: InteractionCandidate;
      ok: true;
    }
  | {
      actorEntityId: string;
      issues: InteractionSolverIssue[];
      message: string;
      ok: false;
      reason: InteractionSolverFailureReason;
    };

const defaultInteractableRadius = 1.5;

export function resolveNearestInteraction(
  world: World,
  actorEntityId: string,
  options: InteractionSolverOptions = {},
): InteractionSolverResult {
  const actorEntity = world.getEntity(actorEntityId);

  if (!actorEntity) {
    return {
      actorEntityId,
      issues: [],
      message: `Interaction actor "${actorEntityId}" does not exist.`,
      ok: false,
      reason: 'missing_actor',
    };
  }

  const actorTransform = world.getRuntimeTransform(actorEntityId);

  if (!actorTransform) {
    return {
      actorEntityId,
      issues: [],
      message: `Interaction actor "${actorEntityId}" has no runtime transform.`,
      ok: false,
      reason: 'missing_actor_transform',
    };
  }

  const actorPosition = cloneVec3(actorTransform.position);
  const positionSources = getInteractionPositionSources(world);
  const issues: InteractionSolverIssue[] = [];
  const candidates: InteractionCandidate[] = [];

  for (const entity of world.toEntityData()) {
    if (!options.includeActor && entity.id === actorEntityId) {
      continue;
    }

    const candidate = createInteractionCandidate(
      world,
      entity,
      actorPosition,
      positionSources,
      options,
      issues,
    );

    if (candidate && candidate.distance <= candidate.radius) {
      candidates.push(candidate);
    }
  }

  candidates.sort(compareInteractionCandidates);

  return {
    actor: {
      entityId: actorEntityId,
      position: actorPosition,
      positionSource: positionSources.get(actorEntityId) ?? 'authored',
    },
    candidates,
    issues,
    nearest: candidates[0],
    ok: true,
  };
}

function createInteractionCandidate(
  world: World,
  entity: EntityData,
  actorPosition: TransformData['position'],
  positionSources: ReadonlyMap<string, InteractionPositionSource>,
  options: InteractionSolverOptions,
  issues: InteractionSolverIssue[],
): InteractionCandidate | undefined {
  const deliveryEndpoint = parseDeliveryEndpoint(entity, issues);
  const interactable = parseInteractable(entity, issues);

  if (!deliveryEndpoint && !interactable) {
    return undefined;
  }

  const runtimeTransform = world.getRuntimeTransform(entity.id);

  if (!runtimeTransform) {
    issues.push({
      entityId: entity.id,
      message: `Interaction candidate "${entity.id}" has no runtime transform.`,
      reason: 'missing_candidate_transform',
    });
    return undefined;
  }

  const position = cloneVec3(runtimeTransform.position);
  const distance = getDistance(actorPosition, position);
  const maxDistance = options.maxDistance ?? Number.POSITIVE_INFINITY;

  if (distance > maxDistance) {
    return undefined;
  }

  if (deliveryEndpoint) {
    return {
      deliveryEndpoint: {
        endpointId: deliveryEndpoint.endpointId,
        kind: deliveryEndpoint.kind,
        label: deliveryEndpoint.label,
      },
      distance,
      entityId: entity.id,
      kind: 'deliveryEndpoint',
      position,
      positionSource: positionSources.get(entity.id) ?? 'authored',
      prompt: deliveryEndpoint.prompt ?? interactable?.prompt,
      radius: deliveryEndpoint.interactionRadius,
    };
  }

  return {
    distance,
    entityId: entity.id,
    kind: 'interactable',
    position,
    positionSource: positionSources.get(entity.id) ?? 'authored',
    prompt: interactable?.prompt,
    radius: options.defaultInteractableRadius ?? defaultInteractableRadius,
  };
}

function parseDeliveryEndpoint(
  entity: EntityData,
  issues: InteractionSolverIssue[],
):
  | {
      endpointId: DeliveryEndpointIdData;
      interactionRadius: number;
      kind: 'mailbox' | 'npc';
      label: string;
      prompt?: string;
    }
  | undefined {
  if (!Object.hasOwn(entity.components, 'DeliveryEndpoint')) {
    return undefined;
  }

  const result = DeliveryEndpointComponentSchema.safeParse(entity.components.DeliveryEndpoint);

  if (!result.success) {
    issues.push({
      entityId: entity.id,
      message: `Invalid DeliveryEndpoint component on "${entity.id}".`,
      reason: 'invalid_delivery_endpoint',
    });
    return undefined;
  }

  return result.data;
}

function parseInteractable(
  entity: EntityData,
  issues: InteractionSolverIssue[],
): { prompt?: string } | undefined {
  if (!Object.hasOwn(entity.components, 'Interactable')) {
    return undefined;
  }

  const result = InteractableComponentSchema.safeParse(entity.components.Interactable);

  if (!result.success) {
    issues.push({
      entityId: entity.id,
      message: `Invalid Interactable component on "${entity.id}".`,
      reason: 'invalid_interactable',
    });
    return undefined;
  }

  return result.data;
}

function getInteractionPositionSources(
  world: World,
): ReadonlyMap<string, InteractionPositionSource> {
  const placements = new Set(
    world.getSphericalPlacements().placements.map((placement) => placement.entityId),
  );
  const sources = new Map<string, InteractionPositionSource>();

  for (const entity of world.toEntityData()) {
    if (!entity.placement) {
      sources.set(entity.id, 'authored');
    } else if (placements.has(entity.id)) {
      sources.set(entity.id, 'spherical');
    } else {
      sources.set(entity.id, 'authored-fallback');
    }
  }

  return sources;
}

function compareInteractionCandidates(
  left: InteractionCandidate,
  right: InteractionCandidate,
): number {
  const distanceDelta = left.distance - right.distance;

  if (Math.abs(distanceDelta) > Number.EPSILON) {
    return distanceDelta;
  }

  return left.entityId.localeCompare(right.entityId);
}

function getDistance(left: TransformData['position'], right: TransformData['position']): number {
  const x = right[0] - left[0];
  const y = right[1] - left[1];
  const z = right[2] - left[2];

  return Math.sqrt(x * x + y * y + z * z);
}

function cloneVec3(value: TransformData['position']): TransformData['position'] {
  return [...value];
}
