import { describe, expect, it } from 'vitest';

import level01Json from '../../../data/levels/level_01.json';
import type { EntityData } from '../../schemas/entity.schema';
import { LevelSchema, type LevelData } from '../../schemas/level.schema';
import type { TransformData } from '../../schemas/transform.schema';
import type { WorldProjectionData } from '../../schemas/worldProjection.schema';
import { World } from '../../world';
import { resolveNearestInteraction } from './InteractionSolver';

const identityTransform: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

const worldProjection: WorldProjectionData = {
  type: 'cube-sphere',
  radius: 10,
  regions: [
    {
      face: 'front',
      id: 'city',
      label: 'City',
      localBounds: {
        center: [0, 0, 0],
        size: [4, 4, 4],
      },
      name: 'City Region',
    },
  ],
};

describe('interaction radius delivery endpoint solver', () => {
  it('runs against the spherical demo level without renderer state', () => {
    const world = World.fromLevel(LevelSchema.parse(level01Json));
    const result = resolveNearestInteraction(world, 'player_spawn_01');

    expect(result).toMatchObject({
      actor: {
        entityId: 'player_spawn_01',
        positionSource: 'spherical',
      },
      ok: true,
    });

    if (!result.ok) {
      throw new Error('Expected interaction solver to resolve demo level actor.');
    }

    expect(result.issues).toEqual([]);
  });

  it('returns the nearest delivery endpoint from spherical runtime placement', () => {
    const world = World.fromLevel(
      createLevel(
        [
          createEntity('actor', {
            placement: {
              localPosition: [0, 0, 0],
              mode: 'spherical-region',
              region: 'city',
            },
          }),
          createDeliveryEndpointEntity('near_drop', {
            endpointId: 'delivery.near',
            placementRegion: 'city',
            position: [0.25, 0, 0],
            radius: 1.3,
          }),
          createDeliveryEndpointEntity('far_drop', {
            endpointId: 'delivery.far',
            placementRegion: 'city',
            position: [2, 0, 0],
            radius: 1,
          }),
        ],
        worldProjection,
      ),
    );
    const result = resolveNearestInteraction(world, 'actor');

    expect(result).toMatchObject({
      actor: {
        entityId: 'actor',
        positionSource: 'spherical',
      },
      ok: true,
    });

    if (!result.ok) {
      throw new Error('Expected interaction solver to resolve spherical fixture actor.');
    }

    expect(result.issues).toEqual([]);
    expect(result.nearest).toMatchObject({
      deliveryEndpoint: {
        endpointId: 'delivery.near',
        kind: 'mailbox',
        label: 'near_drop',
      },
      entityId: 'near_drop',
      kind: 'deliveryEndpoint',
      positionSource: 'spherical',
      radius: 1.3,
    });
    expect(result.candidates.map((candidate) => candidate.entityId)).toEqual(['near_drop']);
  });

  it('ignores endpoints outside their interaction radius', () => {
    const world = World.fromLevel(
      createLevel([
        createEntity('actor'),
        createDeliveryEndpointEntity('drop', {
          position: [5, 0, 0],
          radius: 1,
        }),
      ]),
    );
    const result = resolveNearestInteraction(world, 'actor');

    expect(result).toMatchObject({
      candidates: [],
      nearest: undefined,
      ok: true,
    });
  });

  it('sorts equal-distance candidates by entity id for deterministic ties', () => {
    const world = World.fromLevel(
      createLevel([
        createEntity('actor'),
        createDeliveryEndpointEntity('b_endpoint', {
          endpointId: 'delivery.b',
          position: [1, 0, 0],
          radius: 2,
        }),
        createDeliveryEndpointEntity('a_endpoint', {
          endpointId: 'delivery.a',
          position: [-1, 0, 0],
          radius: 2,
        }),
      ]),
    );
    const result = resolveNearestInteraction(world, 'actor');

    expect(result).toMatchObject({
      ok: true,
      nearest: {
        entityId: 'a_endpoint',
      },
    });
  });

  it('supports existing interactable entities without delivery endpoint data', () => {
    const world = World.fromLevel(
      createLevel([
        createEntity('actor'),
        createEntity('panel_switch', {
          components: {
            Interactable: {
              prompt: 'Press switch',
            },
          },
          transform: createTransform([0.5, 0, 0]),
        }),
      ]),
    );
    const result = resolveNearestInteraction(world, 'actor', {
      defaultInteractableRadius: 0.75,
    });

    expect(result).toMatchObject({
      ok: true,
      nearest: {
        entityId: 'panel_switch',
        kind: 'interactable',
        positionSource: 'authored',
        prompt: 'Press switch',
        radius: 0.75,
      },
    });
  });

  it('reports invalid endpoint components without creating stale candidates', () => {
    const world = World.fromLevel(
      createLevel([
        createEntity('actor'),
        createEntity('bad_endpoint', {
          components: {
            DeliveryEndpoint: {
              endpointId: 'delivery.bad',
              interactionRadius: 0,
              kind: 'vendor',
              label: 'Bad Endpoint',
            },
          },
          transform: createTransform([0.5, 0, 0]),
        }),
      ]),
    );
    const result = resolveNearestInteraction(world, 'actor');

    expect(result).toMatchObject({
      candidates: [],
      issues: [
        {
          entityId: 'bad_endpoint',
          reason: 'invalid_delivery_endpoint',
        },
      ],
      ok: true,
    });
  });

  it('falls back to authored transforms when spherical placement is stale', () => {
    const world = World.fromLevel(
      createLevel(
        [
          createEntity('actor'),
          createDeliveryEndpointEntity('stale_drop', {
            placementRegion: 'missing_region',
            position: [0.5, 0, 0],
            radius: 1,
          }),
        ],
        worldProjection,
      ),
    );
    const result = resolveNearestInteraction(world, 'actor');

    expect(result).toMatchObject({
      ok: true,
      nearest: {
        entityId: 'stale_drop',
        position: [0.5, 0, 0],
        positionSource: 'authored-fallback',
      },
    });
  });

  it('runs in flat no-render contexts using authored transforms only', () => {
    const world = World.fromLevel(
      createLevel([
        createEntity('actor'),
        createDeliveryEndpointEntity('flat_drop', {
          position: [0.75, 0, 0],
          radius: 1,
        }),
      ]),
    );
    const result = resolveNearestInteraction(world, 'actor');

    expect(result).toMatchObject({
      actor: {
        positionSource: 'authored',
      },
      ok: true,
      nearest: {
        entityId: 'flat_drop',
        positionSource: 'authored',
      },
    });
  });

  it('returns failure results for missing actors before scanning candidates', () => {
    const world = World.fromLevel(createLevel([createDeliveryEndpointEntity('drop')]));

    expect(resolveNearestInteraction(world, 'missing_actor')).toEqual({
      actorEntityId: 'missing_actor',
      issues: [],
      message: 'Interaction actor "missing_actor" does not exist.',
      ok: false,
      reason: 'missing_actor',
    });
  });
});

function createLevel(entities: EntityData[], projection?: WorldProjectionData): LevelData {
  return {
    cameraShots: [],
    entities,
    events: [],
    id: 'level_interaction_test',
    name: 'Interaction Test',
    schemaVersion: 1,
    timelines: [],
    ...(projection ? { worldProjection: projection } : {}),
  };
}

function createDeliveryEndpointEntity(
  id: string,
  options: {
    endpointId?: string;
    placementRegion?: string;
    position?: TransformData['position'];
    radius?: number;
  } = {},
): EntityData {
  return createEntity(id, {
    components: {
      DeliveryEndpoint: {
        endpointId: options.endpointId ?? `delivery.${id}`,
        interactionRadius: options.radius ?? 1,
        kind: 'mailbox',
        label: id,
      },
    },
    ...(options.placementRegion
      ? {
          placement: {
            localPosition: options.position,
            mode: 'spherical-region',
            region: options.placementRegion,
          },
        }
      : {}),
    transform: createTransform(options.position ?? [0.5, 0, 0]),
  });
}

function createEntity(id: string, overrides: Partial<EntityData> = {}): EntityData {
  return {
    components: {},
    id,
    transform: identityTransform,
    ...overrides,
  };
}

function createTransform(position: TransformData['position']): TransformData {
  return {
    ...identityTransform,
    position,
  };
}
