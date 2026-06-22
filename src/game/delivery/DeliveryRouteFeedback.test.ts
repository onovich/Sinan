import { describe, expect, it } from 'vitest';

import level01Json from '../../../data/levels/level_01.json';
import { LevelSchema, type LevelData } from '../../schemas/level.schema';
import type { TransformData } from '../../schemas/transform.schema';
import { World } from '../../world';
import { createDeliveryJobRuntimeFromLevel } from './DeliveryJobRuntime';
import { createDeliveryRouteFeedbackState } from './DeliveryRouteFeedback';

const identityTransform: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

describe('delivery route target feedback state', () => {
  it('creates visible route and target markers from the spherical demo level', () => {
    const level = LevelSchema.parse(level01Json);
    const state = createDeliveryRouteFeedbackState({
      level,
      world: World.fromLevel(level),
    });

    expect(state).toMatchObject({
      issueCount: 0,
      jobId: 'job.hill_mail_run',
      markerCount: 3,
      status: 'available',
    });
    expect(state.markers.map((marker) => marker.kind)).toEqual(['accept', 'route', 'target']);
    expect(state.markers.every((marker) => marker.visible)).toBe(true);
    expect(state.markers.find((marker) => marker.kind === 'accept')).toMatchObject({
      active: true,
      endpointId: 'delivery.courier_hill',
      fallbackUsed: false,
      status: 'active',
    });
    expect(state.markers.find((marker) => marker.kind === 'target')).toMatchObject({
      endpointId: 'delivery.mailbox_hill',
      target: true,
    });
    expect(state.markers.find((marker) => marker.kind === 'route')).toMatchObject({
      fallbackUsed: false,
      regionId: 'hill',
    });
  });

  it('tracks active and completed marker state from a delivery job snapshot', () => {
    const level = LevelSchema.parse(level01Json);
    const runtime = createDeliveryJobRuntimeFromLevel(level);

    runtime.accept('job.hill_mail_run', 'delivery.courier_hill');
    runtime.progress('job.hill_mail_run');

    const active = createDeliveryRouteFeedbackState({
      level,
      snapshot: runtime.getSnapshot(),
      world: World.fromLevel(level),
    });

    expect(active).toMatchObject({
      activeJobId: 'job.hill_mail_run',
      status: 'inProgress',
    });
    expect(active.markers.filter((marker) => marker.active).map((marker) => marker.kind)).toEqual([
      'route',
      'target',
    ]);

    runtime.readyToDeliver('job.hill_mail_run', 'delivery.mailbox_hill');
    runtime.complete('job.hill_mail_run', 'delivery.mailbox_hill');

    const completed = createDeliveryRouteFeedbackState({
      level,
      snapshot: runtime.getSnapshot(),
      world: World.fromLevel(level),
    });

    expect(completed.status).toBe('completed');
    expect(completed.markers.every((marker) => marker.completed)).toBe(true);
    expect(completed.markers.every((marker) => !marker.active)).toBe(true);
  });

  it('keeps fallback route markers when the target endpoint is missing', () => {
    const level = createMissingTargetLevel();
    const state = createDeliveryRouteFeedbackState({
      level,
      world: World.fromLevel(level),
    });

    expect(state.status).toBe('blocked');
    expect(state.issues).toContainEqual({
      endpointId: 'delivery.drop',
      jobId: 'job.mail',
      message: 'Delivery job "job.mail" is missing target endpoint "delivery.drop".',
      reason: 'missing_target_endpoint',
    });
    expect(state.markers).toEqual([
      expect.objectContaining({
        endpointId: 'delivery.pickup',
        kind: 'accept',
        visible: true,
      }),
      expect.objectContaining({
        kind: 'route',
        regionId: 'city',
        visible: true,
      }),
    ]);
    expect(state.markers.some((marker) => marker.endpointId === 'delivery.drop')).toBe(false);
  });
});

function createMissingTargetLevel(): LevelData {
  return {
    cameraShots: [],
    entities: [
      {
        components: {
          DeliveryEndpoint: {
            endpointId: 'delivery.pickup',
            interactionRadius: 1.2,
            kind: 'npc',
            label: 'Pickup',
          },
        },
        id: 'pickup',
        placement: {
          mode: 'spherical-region',
          region: 'city',
        },
        transform: identityTransform,
      },
    ],
    deliveryJobs: [
      {
        acceptEndpointId: 'delivery.pickup',
        completion: {
          endpointId: 'delivery.drop',
          type: 'deliverToEndpoint',
        },
        defaultStatus: 'available',
        description: 'Carry a packet across the compact world.',
        feedback: {
          accepted: 'Accepted.',
          completed: 'Complete.',
          inProgress: 'In progress.',
          readyToDeliver: 'Ready.',
        },
        id: 'job.mail',
        routeHints: [
          {
            endpointId: 'delivery.pickup',
            type: 'endpoint',
          },
          {
            label: 'Follow city path',
            localPosition: [0, 0, 0],
            region: 'city',
            type: 'spherical-region',
          },
          {
            endpointId: 'delivery.drop',
            type: 'endpoint',
          },
        ],
        targetEndpointId: 'delivery.drop',
        title: 'Mail Run',
      },
    ],
    events: [],
    id: 'level_missing_target',
    name: 'Missing Target',
    schemaVersion: 1,
    timelines: [],
    worldProjection: {
      radius: 12,
      regions: [
        {
          face: 'front',
          id: 'city',
          label: 'City',
          localBounds: {
            center: [0, 0, 0],
            size: [2, 2, 2],
          },
          name: 'City',
        },
      ],
      type: 'cube-sphere',
    },
  };
}
