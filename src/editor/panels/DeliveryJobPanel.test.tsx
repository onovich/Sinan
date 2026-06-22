import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { LevelData } from '../../schemas/level.schema';
import type { TransformData } from '../../schemas/transform.schema';
import { DeliveryJobPanel } from './DeliveryJobPanel';

const transform: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

describe('delivery editor panel command affordance', () => {
  it('renders delivery job inspection fields and endpoint references', () => {
    const markup = renderToStaticMarkup(
      <DeliveryJobPanel level={createLevel()} onApplyJob={() => undefined} />,
    );

    expect(markup).toContain('Delivery Jobs');
    expect(markup).toContain('Mail Run (job.mail)');
    expect(markup).toContain('Carry a packet.');
    expect(markup).toContain('Pickup (delivery.pickup)');
    expect(markup).toContain('Drop (delivery.drop)');
    expect(markup).toContain('Apply Job');
  });

  it('shows validation errors for stale delivery job drafts', () => {
    const level = createLevel();
    const job = level.deliveryJobs?.[0];

    if (!job) {
      throw new Error('Missing fixture delivery job.');
    }

    const invalidLevel = {
      ...level,
      deliveryJobs: [
        {
          ...job,
          title: '',
        },
      ],
    } as LevelData;
    const markup = renderToStaticMarkup(
      <DeliveryJobPanel level={invalidLevel} onApplyJob={() => undefined} />,
    );

    expect(markup).toContain('validation-list');
    expect(markup).toContain('title');
  });
});

export function createLevel(): LevelData {
  return {
    cameraShots: [],
    deliveryJobs: [
      {
        acceptEndpointId: 'delivery.pickup',
        completion: {
          endpointId: 'delivery.drop',
          type: 'deliverToEndpoint',
        },
        defaultStatus: 'available',
        description: 'Carry a packet.',
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
        ],
        targetEndpointId: 'delivery.drop',
        title: 'Mail Run',
      },
    ],
    entities: [
      createEndpoint('pickup', 'delivery.pickup', 'Pickup', 'npc'),
      createEndpoint('drop', 'delivery.drop', 'Drop', 'mailbox'),
    ],
    events: [],
    id: 'level_delivery_panel',
    name: 'Delivery Panel',
    schemaVersion: 1,
    timelines: [],
  };
}

function createEndpoint(id: string, endpointId: string, label: string, kind: 'mailbox' | 'npc') {
  return {
    components: {
      DeliveryEndpoint: {
        endpointId,
        interactionRadius: 1.6,
        kind,
        label,
      },
    },
    id,
    transform,
  };
}
