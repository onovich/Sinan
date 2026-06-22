import { describe, expect, it } from 'vitest';

import { createDemoDataRepository } from '../../data/demoDataLoader';
import { EventSystem } from '../../events/EventSystem';
import { TriggerSystem } from '../../events/TriggerSystem';
import {
  createEventRuntimeState,
  syncDeliveryJobRuntimeState,
  type ActionExecutionContext,
} from '../../events/types';
import type { LevelData } from '../../schemas/level.schema';
import { World } from '../../world';
import { createDeliveryJobRuntimeFromLevel } from './DeliveryJobRuntime';
import { createDeliveryHudViewModel } from './DeliveryHudViewModel';
import { createDeliveryRouteFeedbackState } from './DeliveryRouteFeedback';

describe('delivery showcase job flow', () => {
  it('runs accept, route feedback, deliver, complete, and reload reset on demo data', async () => {
    const project = await createDemoDataRepository().loadProjectLevel('level_01');
    const triggerSystem = new TriggerSystem(new EventSystem(Object.values(project.events)));
    const context = createFlowContext(project.level);

    expect(project.level.deliveryJobs?.map((job) => job.id)).toEqual(['job.hill_mail_run']);
    expect(project.level.events).toEqual([
      'ev_gate_trigger_enter',
      'ev_gate_trigger_exit',
      'ev_switch_a_open_gate',
      'ev_delivery_accept',
      'ev_delivery_progress',
      'ev_delivery_ready',
      'ev_delivery_complete',
    ]);
    expect(context.state.deliveryJobs['job.hill_mail_run']).toBe('available');
    expect(context.state.activeDeliveryJobId).toBeUndefined();

    const acceptedEvents = triggerSystem.interact('courier_hill_01', context);

    expect(acceptedEvents).toEqual(['ev_delivery_accept', 'ev_delivery_progress']);
    expect(context.state.deliveryJobs['job.hill_mail_run']).toBe('inProgress');
    expect(context.state.activeDeliveryJobId).toBe('job.hill_mail_run');
    expect(context.directorCommands).toContainEqual({
      type: 'subtitle.show',
      text: 'Gate permit packet accepted.',
      duration: 1.6,
      speaker: 'courier_hill_01',
    });

    const routeFeedback = createDeliveryRouteFeedbackState({
      level: project.level,
      snapshot: context.deliveryJobs.getSnapshot(),
      world: World.fromLevel(project.level),
    });
    const activeMarkerKinds = routeFeedback.markers
      .filter((marker) => marker.active)
      .map((marker) => marker.kind);
    const inProgressHud = createDeliveryHudViewModel({
      level: project.level,
      routeFeedback,
      snapshot: context.deliveryJobs.getSnapshot(),
    });

    expect(routeFeedback).toMatchObject({
      activeJobId: 'job.hill_mail_run',
      issueCount: 0,
      jobId: 'job.hill_mail_run',
      markerCount: 3,
      status: 'inProgress',
    });
    expect(routeFeedback.markers.map((marker) => marker.kind)).toEqual([
      'accept',
      'route',
      'target',
    ]);
    expect(activeMarkerKinds).toEqual(['route', 'target']);
    expect(inProgressHud).toMatchObject({
      activeJobId: 'job.hill_mail_run',
      activeJobStatus: 'inProgress',
      prompt: 'Head to the hill mailbox.',
      routeMarkerCount: 3,
      statusLabel: 'In progress',
      targetLabel: 'Hill Mailbox',
      targetVisible: true,
      tone: 'active',
    });

    const completedEvents = triggerSystem.interact('mailbox_hill_01', context);

    expect(completedEvents).toEqual(['ev_delivery_ready', 'ev_delivery_complete']);
    expect(context.state.deliveryJobs['job.hill_mail_run']).toBe('completed');
    expect(context.state.activeDeliveryJobId).toBeUndefined();
    expect(context.state.flags.job_hill_mail_run_complete).toBe(true);
    expect(context.state.deliveryJobSequence).toBe(4);
    expect(context.directorCommands).toContainEqual({
      type: 'subtitle.show',
      text: 'Hill mail run complete.',
      duration: 1.8,
      speaker: 'mailbox_hill_01',
    });

    const completedRouteFeedback = createDeliveryRouteFeedbackState({
      level: project.level,
      snapshot: context.deliveryJobs.getSnapshot(),
      world: World.fromLevel(project.level),
    });
    const completedHud = createDeliveryHudViewModel({
      level: project.level,
      routeFeedback: completedRouteFeedback,
      snapshot: context.deliveryJobs.getSnapshot(),
    });

    expect(completedRouteFeedback).toMatchObject({
      issueCount: 0,
      markerCount: 3,
      status: 'completed',
    });
    expect(completedRouteFeedback.markers.every((marker) => marker.completed)).toBe(true);
    expect(completedHud).toMatchObject({
      activeJobStatus: 'completed',
      completionText: 'Hill mail run complete.',
      prompt: 'Hill mail run complete.',
      routeMarkerCount: 3,
      targetVisible: false,
      tone: 'success',
    });

    const reloadedContext = createFlowContext(project.level);

    expect(reloadedContext.state.deliveryJobs['job.hill_mail_run']).toBe('available');
    expect(reloadedContext.state.activeDeliveryJobId).toBeUndefined();
    expect(reloadedContext.state.flags.job_hill_mail_run_complete).toBeUndefined();
    expect(reloadedContext.state.deliveryJobSequence).toBe(0);
    expect(triggerSystem.interact('courier_hill_01', reloadedContext)).toEqual(acceptedEvents);
    expect(triggerSystem.interact('mailbox_hill_01', reloadedContext)).toEqual(completedEvents);
    expect(reloadedContext.state.deliveryJobs['job.hill_mail_run']).toBe('completed');
    expect(reloadedContext.directorCommands).toEqual(context.directorCommands);
  });
});

function createFlowContext(level: LevelData): ActionExecutionContext & {
  deliveryJobs: ReturnType<typeof createDeliveryJobRuntimeFromLevel>;
} {
  const deliveryJobs = createDeliveryJobRuntimeFromLevel(level);
  const state = createEventRuntimeState();

  syncDeliveryJobRuntimeState(state, deliveryJobs.getSnapshot());

  return {
    deliveryJobs,
    state,
    directorCommands: [],
  };
}
