import { describe, expect, it } from 'vitest';

import type { DeliveryJobData } from '../../schemas/delivery.schema';
import type { LevelData } from '../../schemas/level.schema';
import type { TransformData } from '../../schemas/transform.schema';
import { DeliveryJobRuntime } from './DeliveryJobRuntime';
import { createDeliveryHudViewModel } from './DeliveryHudViewModel';

const identityTransform: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

describe('delivery hud completion feedback view model', () => {
  it('shows available job prompts and hides target guidance before acceptance', () => {
    const hud = createDeliveryHudViewModel({ level: createLevel() });

    expect(hud).toMatchObject({
      activeJobId: 'job.mail',
      activeJobStatus: 'available',
      blocked: false,
      endpointCount: 2,
      jobCount: 1,
      prompt: 'Carry a packet across the compact world.',
      promptVisible: true,
      statusLabel: 'Available',
      targetLabel: 'Drop',
      targetVisible: false,
      tone: 'neutral',
    });
  });

  it('updates accepted, target, and ready prompts from runtime snapshots', () => {
    const level = createLevel();
    const runtime = new DeliveryJobRuntime(level.deliveryJobs ?? [], {
      endpointIds: ['delivery.pickup', 'delivery.drop'],
    });

    runtime.accept('job.mail', 'delivery.pickup');

    expect(
      createDeliveryHudViewModel({
        level,
        snapshot: runtime.getSnapshot(),
      }),
    ).toMatchObject({
      activeJobId: 'job.mail',
      activeJobStatus: 'accepted',
      prompt: 'Accepted.',
      statusLabel: 'Accepted',
      targetLabel: 'Drop',
      targetVisible: true,
      tone: 'active',
    });

    runtime.progress('job.mail');
    runtime.readyToDeliver('job.mail', 'delivery.drop');

    expect(
      createDeliveryHudViewModel({
        level,
        snapshot: runtime.getSnapshot(),
      }).prompt,
    ).toBe('Ready. Target: Drop.');
  });

  it('exposes completion feedback and success tone for completed jobs', () => {
    const level = createLevel();
    const runtime = new DeliveryJobRuntime(level.deliveryJobs ?? []);

    runtime.accept('job.mail');
    runtime.progress('job.mail');
    runtime.readyToDeliver('job.mail');
    runtime.complete('job.mail');

    expect(
      createDeliveryHudViewModel({
        level,
        snapshot: runtime.getSnapshot(),
      }),
    ).toMatchObject({
      activeJobStatus: 'completed',
      completionText: 'Complete.',
      prompt: 'Complete.',
      statusLabel: 'Completed',
      targetVisible: false,
      tone: 'success',
    });
  });

  it('keeps interaction prompts visible without mutating job rules', () => {
    expect(
      createDeliveryHudViewModel({
        interactionPrompt: {
          endpointId: 'delivery.pickup',
          text: 'Press E to accept parcel',
        },
        level: createLevel(),
      }),
    ).toMatchObject({
      activeJobStatus: 'available',
      prompt: 'Press E to accept parcel',
      promptVisible: true,
    });
  });

  it('reports blocked stale state and empty job fallback', () => {
    const blockedLevel = createLevel({
      targetEndpointId: 'delivery.missing',
    });
    const blocked = createDeliveryHudViewModel({ level: blockedLevel });

    expect(blocked).toMatchObject({
      activeJobStatus: 'blocked',
      blocked: true,
      stale: true,
      prompt: 'Delivery job "job.mail" is missing target endpoint "delivery.missing".',
      tone: 'warning',
    });

    expect(
      createDeliveryHudViewModel({
        level: {
          ...createLevel(),
          deliveryJobs: [],
        },
      }),
    ).toMatchObject({
      activeJobStatus: 'unavailable',
      empty: true,
      prompt: 'No delivery jobs loaded',
      promptVisible: true,
      tone: 'muted',
    });
  });
});

function createLevel(jobOverrides: Partial<DeliveryJobData> = {}): LevelData {
  return {
    cameraShots: [],
    deliveryJobs: [
      {
        acceptEndpointId: 'delivery.pickup',
        completion: {
          endpointId: jobOverrides.targetEndpointId ?? 'delivery.drop',
          type: 'deliverToEndpoint',
        },
        defaultStatus: 'available',
        description: 'Carry a packet across the compact world.',
        feedback: {
          accepted: 'Accepted.',
          blocked: 'Blocked.',
          completed: 'Complete.',
          failed: 'Failed.',
          inProgress: 'In progress.',
          readyToDeliver: 'Ready.',
        },
        id: 'job.mail',
        routeHints: [],
        targetEndpointId: 'delivery.drop',
        title: 'Mail Run',
        ...jobOverrides,
      },
    ],
    entities: [
      createEndpoint('pickup', 'delivery.pickup', 'Pickup', 'npc'),
      createEndpoint('drop', 'delivery.drop', 'Drop', 'mailbox'),
    ],
    events: [],
    id: 'level_delivery_hud',
    name: 'Delivery HUD',
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
    transform: identityTransform,
  };
}
