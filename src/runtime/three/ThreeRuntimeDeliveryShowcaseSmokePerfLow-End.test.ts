import { describe, expect, it } from 'vitest';

import assetsManifest from '../../../data/assets.manifest.json';
import level01 from '../../../data/levels/level_01.json';
import {
  createDeliveryJobRuntimeFromLevel,
  createDeliveryRouteFeedbackState,
} from '../../game/delivery';
import { AssetManifestSchema } from '../../schemas/asset.schema';
import { LevelSchema } from '../../schemas/level.schema';
import type { RuntimeDeliveryRouteFeedbackDiagnostics } from '../RuntimeTypes';
import { World } from '../../world';
import { ThreeDeliveryRouteFeedbackRuntime } from './ThreeDeliveryRouteFeedbackRuntime';

describe('delivery showcase smoke perf low-end budget', () => {
  it('keeps route feedback, draw-call, triangle, and instance budgets deterministic', () => {
    const level = LevelSchema.parse(level01);
    const assets = AssetManifestSchema.parse(assetsManifest);
    const deliveryJobs = createDeliveryJobRuntimeFromLevel(level);
    const standardRuntime = new ThreeDeliveryRouteFeedbackRuntime();
    const lowEndRuntime = new ThreeDeliveryRouteFeedbackRuntime();

    deliveryJobs.accept('job.hill_mail_run', 'delivery.courier_hill');
    deliveryJobs.progress('job.hill_mail_run');

    const routeFeedback = createDeliveryRouteFeedbackState({
      level,
      snapshot: deliveryJobs.getSnapshot(),
      world: World.fromLevel(level),
    });

    standardRuntime.setState(routeFeedback);
    lowEndRuntime.setQualityProfile('low-end');
    lowEndRuntime.setState(routeFeedback);

    const standardDiagnostics = standardRuntime.getDiagnostics();
    const lowEndDiagnostics = lowEndRuntime.getDiagnostics();

    expect(routeFeedback).toMatchObject({
      activeJobId: 'job.hill_mail_run',
      issueCount: 0,
      markerCount: 3,
      status: 'inProgress',
    });
    expect(standardDiagnostics).toMatchObject({
      activeMarkerCount: 2,
      issueCount: 0,
      lowEndSuppressedCount: 0,
      markerCount: 3,
      visibleMarkerCount: 3,
    });
    expect(lowEndDiagnostics).toMatchObject({
      activeMarkerCount: 1,
      issueCount: 0,
      lowEndSuppressedCount: 1,
      markerCount: 3,
      visibleMarkerCount: 2,
    });
    expect(estimateRouteFeedbackDrawCalls(standardDiagnostics)).toBeLessThanOrEqual(6);
    expect(estimateRouteFeedbackDrawCalls(lowEndDiagnostics)).toBeLessThanOrEqual(4);
    expect(estimateManifestTriangleBudget(assets)).toBeLessThanOrEqual(420);
    expect(estimateScatterInstanceBudget(level)).toEqual({
      lowEndInstances: 3,
      standardInstances: 6,
    });

    deliveryJobs.readyToDeliver('job.hill_mail_run', 'delivery.mailbox_hill');
    deliveryJobs.complete('job.hill_mail_run', 'delivery.mailbox_hill');
    standardRuntime.setState(
      createDeliveryRouteFeedbackState({
        level,
        snapshot: deliveryJobs.getSnapshot(),
        world: World.fromLevel(level),
      }),
    );

    expect(standardRuntime.getDiagnostics()).toMatchObject({
      activeMarkerCount: 0,
      completedMarkerCount: 3,
      markerCount: 3,
      visibleMarkerCount: 3,
    });

    standardRuntime.dispose();
    lowEndRuntime.dispose();
  });
});

function estimateRouteFeedbackDrawCalls(
  diagnostics: RuntimeDeliveryRouteFeedbackDiagnostics,
): number {
  return diagnostics.visibleMarkerCount * 2;
}

function estimateManifestTriangleBudget(
  assets: ReturnType<typeof AssetManifestSchema.parse>,
): number {
  return Object.values(assets.assets).reduce((sum, asset) => {
    if (asset.type !== 'model') {
      return sum;
    }

    return sum + (asset.metadata?.maxTriangles ?? 0);
  }, 0);
}

function estimateScatterInstanceBudget(level: ReturnType<typeof LevelSchema.parse>): {
  lowEndInstances: number;
  standardInstances: number;
} {
  return (level.scatterGroups ?? []).reduce(
    (budget, group) => {
      const lowEndScale = group.quality?.lowEndCountScale ?? 1;

      return {
        standardInstances: budget.standardInstances + group.count,
        lowEndInstances: budget.lowEndInstances + Math.ceil(group.count * lowEndScale),
      };
    },
    {
      lowEndInstances: 0,
      standardInstances: 0,
    },
  );
}
