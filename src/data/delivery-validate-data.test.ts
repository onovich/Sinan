import { describe, expect, it } from 'vitest';

import type { AssetManifestData } from '../schemas/asset.schema';
import type { EventData } from '../schemas/event.schema';
import type { LevelData } from '../schemas/level.schema';
import type { TransformData } from '../schemas/transform.schema';
import { validateProject } from './validateProject';

const assets: AssetManifestData = {
  schemaVersion: 1,
  assets: {},
};

const identityTransform: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

const deliveryLevel: LevelData = {
  schemaVersion: 1,
  id: 'level_01',
  name: 'Delivery Demo',
  worldProjection: {
    type: 'cube-sphere',
    radius: 6,
    regions: [
      {
        id: 'hill',
        name: 'Signal Hill',
        label: 'Hill',
        face: 'right',
        localBounds: {
          center: [0, 0, 0],
          size: [3, 2, 3],
        },
      },
    ],
  },
  entities: [
    {
      id: 'courier_hill_01',
      transform: identityTransform,
      components: {
        DeliveryEndpoint: {
          endpointId: 'delivery.courier_hill',
          kind: 'npc',
          label: 'Hill Courier',
          interactionRadius: 1.6,
          prompt: 'Accept parcel',
        },
      },
    },
    {
      id: 'mailbox_hill_01',
      transform: identityTransform,
      components: {
        DeliveryEndpoint: {
          endpointId: 'delivery.mailbox_hill',
          kind: 'mailbox',
          label: 'Hill Mailbox',
          interactionRadius: 1.4,
          prompt: 'Deliver parcel',
        },
      },
    },
  ],
  deliveryJobs: [
    {
      id: 'job.hill_mail_run',
      title: 'Hill Mail Run',
      description: 'Carry the hill parcel to the nearby mailbox.',
      acceptEndpointId: 'delivery.courier_hill',
      targetEndpointId: 'delivery.mailbox_hill',
      defaultStatus: 'available',
      package: {
        kind: 'parcel',
        label: 'Gate permit packet',
        itemId: 'parcel.gate_permit',
      },
      routeHints: [
        {
          type: 'endpoint',
          endpointId: 'delivery.courier_hill',
        },
        {
          type: 'spherical-region',
          region: 'hill',
          localPosition: [0.4, 0.12, 0.3],
        },
        {
          type: 'endpoint',
          endpointId: 'delivery.mailbox_hill',
        },
      ],
      completion: {
        type: 'deliverToEndpoint',
        endpointId: 'delivery.mailbox_hill',
      },
      feedback: {
        accepted: 'Parcel accepted.',
        inProgress: 'Head to the hill mailbox.',
        readyToDeliver: 'Mailbox reached.',
        completed: 'Delivery complete.',
      },
    },
  ],
  events: [],
  timelines: [],
  cameraShots: [],
};

describe('delivery validate-data references', () => {
  it('accepts valid delivery endpoints and job data', () => {
    expect(validateProject({ assets, prefabs: [], levels: [deliveryLevel] }).issues).toEqual([]);
  });

  it('reports stale delivery endpoint, route, and completion references', () => {
    const issues = validateProject({
      assets,
      prefabs: [],
      levels: [
        {
          ...deliveryLevel,
          entities: [
            ...deliveryLevel.entities,
            {
              id: 'courier_duplicate_01',
              transform: identityTransform,
              components: {
                DeliveryEndpoint: {
                  endpointId: 'delivery.courier_hill',
                  kind: 'npc',
                  label: 'Duplicate Courier',
                  interactionRadius: 1.2,
                },
              },
            },
          ],
          deliveryJobs: [
            {
              ...deliveryLevel.deliveryJobs![0],
              id: 'job.duplicate',
              acceptEndpointId: 'delivery.missing_accept',
              completion: {
                type: 'deliverToEndpoint',
                endpointId: 'delivery.other',
              },
              routeHints: [
                {
                  type: 'endpoint',
                  endpointId: 'delivery.missing_route',
                },
                {
                  type: 'spherical-region',
                  region: 'beach',
                },
              ],
            },
            {
              ...deliveryLevel.deliveryJobs![0],
              id: 'job.duplicate',
              acceptEndpointId: 'delivery.mailbox_hill',
              targetEndpointId: 'delivery.mailbox_hill',
            },
          ],
        },
      ],
    }).issues;

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'data/levels/level_01.json.entities.components.DeliveryEndpoint',
          message: 'Duplicate delivery endpoint id "delivery.courier_hill".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.deliveryJobs',
          message: 'Duplicate delivery job id "job.duplicate".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.deliveryJobs.job.duplicate.acceptEndpointId',
          message: 'Missing delivery endpoint "delivery.missing_accept".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.deliveryJobs.job.duplicate.completion.endpointId',
          message: 'Missing delivery endpoint "delivery.other".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.deliveryJobs.job.duplicate.completion.endpointId',
          message:
            'Delivery job "job.duplicate" completion endpoint must match target endpoint "delivery.mailbox_hill".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.deliveryJobs.job.duplicate.routeHints.0.endpointId',
          message: 'Missing delivery endpoint "delivery.missing_route".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.deliveryJobs.job.duplicate.routeHints.1.region',
          message: 'Missing delivery route region "beach".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.deliveryJobs.job.duplicate.targetEndpointId',
          message: 'Delivery job "job.duplicate" accept and target endpoints must be different.',
        }),
      ]),
    );
  });

  it('reports invalid delivery endpoint component payloads', () => {
    const issues = validateProject({
      assets,
      prefabs: [],
      levels: [
        {
          ...deliveryLevel,
          entities: [
            {
              ...deliveryLevel.entities[0],
              components: {
                DeliveryEndpoint: {
                  endpointId: 'delivery.courier_hill',
                  kind: 'vendor',
                  label: 'Hill Courier',
                  interactionRadius: 0,
                },
              },
            },
          ],
        },
      ],
    }).issues;

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'data/levels/level_01.json.entities.courier_hill_01.components.DeliveryEndpoint',
        }),
        expect.objectContaining({
          message: 'Missing delivery endpoint "delivery.courier_hill".',
        }),
      ]),
    );
  });

  it('reports stale delivery action and condition references in events', () => {
    const deliveryEvent: EventData = {
      schemaVersion: 1,
      id: 'ev_delivery_stale',
      trigger: {
        type: 'entity.interact',
        entityId: 'courier_hill_01',
      },
      condition: {
        type: 'delivery.statusEquals',
        jobId: 'job.missing',
        status: 'accepted',
      },
      actions: [
        {
          type: 'delivery.accept',
          jobId: 'job.missing',
          endpointId: 'delivery.missing_endpoint',
        },
      ],
    };
    const issues = validateProject({
      assets,
      events: [deliveryEvent],
      prefabs: [],
      levels: [deliveryLevel],
    }).issues;

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'data/events/ev_delivery_stale.json.actions.0.jobId',
          message: 'Missing delivery job "job.missing".',
        }),
        expect.objectContaining({
          path: 'data/events/ev_delivery_stale.json.actions.0.endpointId',
          message: 'Missing delivery endpoint "delivery.missing_endpoint".',
        }),
        expect.objectContaining({
          path: 'data/events/ev_delivery_stale.json.condition.jobId',
          message: 'Missing delivery job "job.missing".',
        }),
      ]),
    );
  });
});
