import { describe, expect, it } from 'vitest';

import type { LevelData } from '../../schemas/level.schema';
import { UpdateDeliveryJobCommand } from './UpdateDeliveryJobCommand';

describe('delivery editor panel command', () => {
  it('updates delivery job data through level command undo and redo state', () => {
    const before = createLevel();
    const job = before.deliveryJobs?.[0];

    if (!job) {
      throw new Error('Missing fixture delivery job.');
    }

    const afterJob = {
      ...job,
      title: 'Updated Mail Run',
      description: 'Updated route description.',
    };
    const levels: LevelData[] = [];
    const command = new UpdateDeliveryJobCommand('job.mail', before, afterJob);
    const context = {
      updateLevel: (level: LevelData) => levels.push(level),
      updateEntityComponents: () => undefined,
      updateEntityTransform: () => undefined,
      updateEvent: () => undefined,
      updateTimeline: () => undefined,
      upsertCameraShot: () => undefined,
      removeCameraShot: () => undefined,
    };

    command.do(context);
    command.undo(context);

    expect(command.id.startsWith('level:delivery-job:job.mail:')).toBe(true);
    expect(levels[0].deliveryJobs?.[0]).toMatchObject({
      description: 'Updated route description.',
      title: 'Updated Mail Run',
    });
    expect(levels[1]).toBe(before);
  });
});

function createLevel(): LevelData {
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
        routeHints: [],
        targetEndpointId: 'delivery.drop',
        title: 'Mail Run',
      },
    ],
    entities: [],
    events: [],
    id: 'level_delivery_command',
    name: 'Delivery Command',
    schemaVersion: 1,
    timelines: [],
  };
}
