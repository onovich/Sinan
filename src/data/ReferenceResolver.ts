import type { AssetManifestData } from '../schemas/asset.schema';
import type { EventData } from '../schemas/event.schema';
import type { LevelData } from '../schemas/level.schema';
import type { PrefabData } from '../schemas/prefab.schema';
import { getRenderableModelAssetId } from './projectDataSelectors';

export type ReferenceSeverity = 'error';

export interface ReferenceValidationIssue {
  severity: ReferenceSeverity;
  path: string;
  message: string;
}

export interface ReferenceValidationInput {
  assets: AssetManifestData;
  prefabs: readonly PrefabData[];
  levels: readonly LevelData[];
  events?: readonly EventData[];
  availableEventIds?: ReadonlySet<string>;
  availableTimelineIds?: ReadonlySet<string>;
  availableCameraShotIds?: ReadonlySet<string>;
}

export function validateProjectReferences(
  input: ReferenceValidationInput,
): ReferenceValidationIssue[] {
  const issues: ReferenceValidationIssue[] = [];
  const prefabIds = new Set<string>();
  const assetIds = new Set(Object.keys(input.assets.assets));

  addDuplicateIdIssues(
    input.prefabs.map((prefab) => prefab.id),
    'data/prefabs',
    'prefab',
    issues,
  );

  for (const prefab of input.prefabs) {
    prefabIds.add(prefab.id);
    addMissingAssetIssue(prefab.model, assetIds, `data/prefabs/${prefab.id}.json.model`, issues);
    addMissingAssetIssue(
      getPrefabRenderableModel(prefab),
      assetIds,
      `data/prefabs/${prefab.id}.json.components.Renderable.model`,
      issues,
    );
  }

  addDuplicateIdIssues(
    input.levels.map((level) => level.id),
    'data/levels',
    'level',
    issues,
  );

  for (const level of input.levels) {
    addDuplicateIdIssues(
      level.entities.map((entity) => entity.id),
      `data/levels/${level.id}.json.entities`,
      'entity',
      issues,
    );

    const project = {
      assets: input.assets,
      level,
      prefabs: Object.fromEntries(input.prefabs.map((prefab) => [prefab.id, prefab])),
    };

    for (const entity of level.entities) {
      if (entity.prefab && !prefabIds.has(entity.prefab)) {
        issues.push({
          severity: 'error',
          path: `data/levels/${level.id}.json.entities.${entity.id}.prefab`,
          message: `Missing prefab "${entity.prefab}".`,
        });
      }

      addMissingAssetIssue(
        getRenderableModelAssetId(project, entity),
        assetIds,
        `data/levels/${level.id}.json.entities.${entity.id}.components.Renderable.model`,
        issues,
      );
    }

    addMissingSetReferences(
      level.events,
      input.availableEventIds,
      `data/levels/${level.id}.json.events`,
      'event',
      issues,
    );
    addMissingSetReferences(
      level.timelines,
      input.availableTimelineIds,
      `data/levels/${level.id}.json.timelines`,
      'timeline',
      issues,
    );
    addMissingSetReferences(
      level.cameraShots,
      input.availableCameraShotIds,
      `data/levels/${level.id}.json.cameraShots`,
      'camera shot',
      issues,
    );
  }

  const entityIds = new Set(
    input.levels.flatMap((level) => level.entities.map((entity) => entity.id)),
  );

  if (input.events) {
    addDuplicateIdIssues(
      input.events.map((event) => event.id),
      'data/events',
      'event',
      issues,
    );

    for (const event of input.events) {
      addEventTriggerReferenceIssues(event, entityIds, input.availableTimelineIds, issues);
    }
  }

  return issues;
}

function addEventTriggerReferenceIssues(
  event: EventData,
  entityIds: ReadonlySet<string>,
  timelineIds: ReadonlySet<string> | undefined,
  issues: ReferenceValidationIssue[],
): void {
  const trigger = event.trigger;
  const path = `data/events/${event.id}.json.trigger`;

  if (trigger.type === 'entity.interact') {
    addMissingEntityReference(trigger.entityId, entityIds, `${path}.entityId`, 'entity', issues);
    return;
  }

  if (trigger.type === 'trigger.enter' || trigger.type === 'trigger.exit') {
    addMissingEntityReference(
      trigger.triggerId,
      entityIds,
      `${path}.triggerId`,
      'trigger target',
      issues,
    );

    if (trigger.entityId) {
      addMissingEntityReference(
        trigger.entityId,
        entityIds,
        `${path}.entityId`,
        'trigger entity',
        issues,
      );
    }
    return;
  }

  if (trigger.type === 'timeline.finished') {
    addMissingSetReferences(
      [trigger.timelineId],
      timelineIds,
      `${path}.timelineId`,
      'timeline',
      issues,
    );
  }
}

function addMissingEntityReference(
  entityId: string,
  entityIds: ReadonlySet<string>,
  path: string,
  label: string,
  issues: ReferenceValidationIssue[],
): void {
  if (entityIds.has(entityId)) {
    return;
  }

  issues.push({
    severity: 'error',
    path,
    message: `Missing ${label} "${entityId}".`,
  });
}

function addDuplicateIdIssues(
  ids: readonly string[],
  path: string,
  label: string,
  issues: ReferenceValidationIssue[],
): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }

  for (const id of duplicates) {
    issues.push({
      severity: 'error',
      path,
      message: `Duplicate ${label} id "${id}".`,
    });
  }
}

function addMissingAssetIssue(
  assetId: string | undefined,
  assetIds: ReadonlySet<string>,
  path: string,
  issues: ReferenceValidationIssue[],
): void {
  if (!assetId || assetIds.has(assetId)) {
    return;
  }

  issues.push({
    severity: 'error',
    path,
    message: `Missing asset "${assetId}".`,
  });
}

function addMissingSetReferences(
  ids: readonly string[],
  availableIds: ReadonlySet<string> | undefined,
  path: string,
  label: string,
  issues: ReferenceValidationIssue[],
): void {
  if (!availableIds) {
    return;
  }

  for (const id of ids) {
    if (!availableIds.has(id)) {
      issues.push({
        severity: 'error',
        path,
        message: `Missing ${label} "${id}".`,
      });
    }
  }
}

function getPrefabRenderableModel(prefab: PrefabData): string | undefined {
  const renderable = prefab.components.Renderable;

  if (
    typeof renderable === 'object' &&
    renderable !== null &&
    !Array.isArray(renderable) &&
    typeof renderable.model === 'string'
  ) {
    return renderable.model;
  }

  return undefined;
}
