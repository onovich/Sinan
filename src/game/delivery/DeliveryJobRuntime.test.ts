import { describe, expect, it } from 'vitest';

import level01Json from '../../../data/levels/level_01.json';
import type { DeliveryJobData } from '../../schemas/delivery.schema';
import { LevelSchema, type LevelData } from '../../schemas/level.schema';
import type { TransformData } from '../../schemas/transform.schema';
import {
  DeliveryJobRuntime,
  collectDeliveryEndpointIds,
  createDeliveryJobRuntimeFromLevel,
} from './DeliveryJobRuntime';

const identityTransform: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

describe('delivery job state runtime', () => {
  it('runs a deterministic accept progress deliver complete flow from level data', () => {
    const level = LevelSchema.parse(level01Json);
    const runtime = createDeliveryJobRuntimeFromLevel(level);

    expect(collectDeliveryEndpointIds(level)).toEqual([
      'delivery.courier_hill',
      'delivery.mailbox_hill',
    ]);
    expect(runtime.getSnapshot()).toMatchObject({
      issues: [],
      jobs: [
        {
          jobId: 'job.hill_mail_run',
          sequence: 0,
          status: 'available',
        },
      ],
      sequence: 0,
    });

    expect(runtime.accept('job.hill_mail_run', 'delivery.courier_hill')).toMatchObject({
      ok: true,
      job: {
        jobId: 'job.hill_mail_run',
        sequence: 1,
        status: 'accepted',
      },
      snapshot: {
        activeJobId: 'job.hill_mail_run',
        sequence: 1,
      },
    });
    expect(runtime.progress('job.hill_mail_run')).toMatchObject({
      ok: true,
      job: {
        sequence: 2,
        status: 'inProgress',
      },
    });
    expect(runtime.readyToDeliver('job.hill_mail_run', 'delivery.mailbox_hill')).toMatchObject({
      ok: true,
      job: {
        sequence: 3,
        status: 'readyToDeliver',
      },
    });
    expect(runtime.complete('job.hill_mail_run', 'delivery.mailbox_hill')).toMatchObject({
      ok: true,
      job: {
        sequence: 4,
        status: 'completed',
      },
      snapshot: {
        jobs: [
          {
            jobId: 'job.hill_mail_run',
            sequence: 4,
            status: 'completed',
          },
        ],
        sequence: 4,
      },
    });
    expect(runtime.getSnapshot().activeJobId).toBeUndefined();
  });

  it('reports missing jobs and invalid transitions without mutating state', () => {
    const runtime = new DeliveryJobRuntime([createJob()]);

    expect(runtime.progress('job.mail')).toMatchObject({
      ok: false,
      reason: 'invalid_transition',
      snapshot: {
        sequence: 0,
      },
    });
    expect(runtime.accept('job.missing')).toMatchObject({
      jobId: 'job.missing',
      ok: false,
      reason: 'missing_job',
    });
    expect(runtime.getJob('job.mail')).toMatchObject({
      sequence: 0,
      status: 'available',
    });
  });

  it('blocks stale jobs when required endpoints are missing', () => {
    const runtime = new DeliveryJobRuntime([createJob()], {
      endpointIds: ['delivery.pickup'],
    });

    expect(runtime.getSnapshot()).toEqual({
      issues: [
        {
          endpointId: 'delivery.drop',
          jobId: 'job.mail',
          message: 'Delivery job "job.mail" is missing target endpoint "delivery.drop".',
          reason: 'missing_target_endpoint',
        },
      ],
      jobs: [
        {
          issue: {
            endpointId: 'delivery.drop',
            jobId: 'job.mail',
            message: 'Delivery job "job.mail" is missing target endpoint "delivery.drop".',
            reason: 'missing_target_endpoint',
          },
          jobId: 'job.mail',
          sequence: 0,
          status: 'blocked',
        },
      ],
      sequence: 0,
    });
    expect(runtime.accept('job.mail')).toMatchObject({
      ok: false,
      reason: 'stale_job',
    });
  });

  it('detects stale route endpoints before runtime transitions start', () => {
    const runtime = new DeliveryJobRuntime(
      [
        createJob({
          routeHints: [
            {
              type: 'endpoint',
              endpointId: 'delivery.missing_route',
            },
          ],
        }),
      ],
      {
        endpointIds: ['delivery.pickup', 'delivery.drop'],
      },
    );

    expect(runtime.getSnapshot().issues).toEqual([
      {
        endpointId: 'delivery.missing_route',
        jobId: 'job.mail',
        message: 'Delivery job "job.mail" is missing route endpoint "delivery.missing_route".',
        reason: 'missing_route_endpoint',
      },
    ]);
  });

  it('rejects completed jobs and supports reset without mutating source data', () => {
    const job = createJob();
    const runtime = new DeliveryJobRuntime([job]);

    runtime.accept('job.mail');
    runtime.progress('job.mail');
    runtime.readyToDeliver('job.mail');
    runtime.complete('job.mail');

    expect(runtime.complete('job.mail')).toMatchObject({
      ok: false,
      reason: 'completed_job',
    });
    expect(job.defaultStatus).toBe('available');
    expect(runtime.reset()).toEqual({
      issues: [],
      jobs: [
        {
          jobId: 'job.mail',
          sequence: 0,
          status: 'available',
        },
      ],
      sequence: 0,
    });
  });

  it('initializes blocked and failed default states as terminal runtime states', () => {
    const runtime = new DeliveryJobRuntime([
      createJob({ defaultStatus: 'blocked', id: 'job.blocked' }),
      createJob({ defaultStatus: 'failed', id: 'job.failed' }),
    ]);

    expect(runtime.accept('job.blocked')).toMatchObject({
      ok: false,
      reason: 'invalid_transition',
    });
    expect(runtime.accept('job.failed')).toMatchObject({
      ok: false,
      reason: 'invalid_transition',
    });
  });

  it('collects delivery endpoint ids from valid level components only', () => {
    expect(collectDeliveryEndpointIds(createLevel())).toEqual(['delivery.drop', 'delivery.pickup']);
    expect(
      collectDeliveryEndpointIds({
        ...createLevel(),
        entities: [
          {
            id: 'bad_endpoint',
            transform: identityTransform,
            components: {
              DeliveryEndpoint: {
                endpointId: 'delivery.bad',
                kind: 'vendor',
                label: 'Bad endpoint',
                interactionRadius: 0,
              },
            },
          },
        ],
      }),
    ).toEqual([]);
  });
});

function createJob(overrides: Partial<DeliveryJobData> = {}): DeliveryJobData {
  return {
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
    package: {
      itemId: 'parcel.mail',
      kind: 'parcel',
      label: 'Mail packet',
    },
    routeHints: [
      {
        endpointId: 'delivery.pickup',
        type: 'endpoint',
      },
      {
        endpointId: 'delivery.drop',
        type: 'endpoint',
      },
    ],
    targetEndpointId: 'delivery.drop',
    title: 'Mail Run',
    ...overrides,
  };
}

function createLevel(): LevelData {
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
        transform: identityTransform,
      },
      {
        components: {
          DeliveryEndpoint: {
            endpointId: 'delivery.drop',
            interactionRadius: 1.2,
            kind: 'mailbox',
            label: 'Drop',
          },
        },
        id: 'drop',
        transform: identityTransform,
      },
    ],
    events: [],
    id: 'level_test',
    name: 'Delivery Test',
    schemaVersion: 1,
    timelines: [],
  };
}
