import { describe, expect, it } from 'vitest';

import { LevelSchema } from './level.schema';

const identityTransform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

describe('delivery job schemas', () => {
  it('parses delivery endpoints and jobs on level data', () => {
    const result = LevelSchema.safeParse({
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
              label: 'Hill bend',
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
    });

    if (!result.success) {
      throw result.error;
    }

    expect(result.data.deliveryJobs[0].routeHints).toHaveLength(3);
  });

  it('rejects invalid delivery status and route hint contracts', () => {
    const result = LevelSchema.safeParse({
      schemaVersion: 1,
      id: 'level_01',
      name: 'Delivery Demo',
      entities: [],
      deliveryJobs: [
        {
          id: 'job.bad',
          title: 'Bad Job',
          description: 'Invalid status should fail schema validation.',
          acceptEndpointId: 'delivery.a',
          targetEndpointId: 'delivery.b',
          defaultStatus: 'queued',
          routeHints: [
            {
              type: 'spherical-region',
              region: 'hill',
              object3D: 'three-object',
            },
          ],
          completion: {
            type: 'deliverToEndpoint',
            endpointId: 'delivery.b',
          },
          feedback: {
            accepted: 'Accepted.',
            inProgress: 'Moving.',
            readyToDeliver: 'Ready.',
            completed: 'Done.',
          },
        },
      ],
      events: [],
      timelines: [],
      cameraShots: [],
    });

    expect(result.success).toBe(false);
  });
});
