import type { AssetManifestData } from '../schemas/asset.schema';
import type { ActionData } from '../schemas/action.schema';
import type {
  CameraShotData,
  CameraLookAtData,
  CameraPointData,
  SphericalCameraPointData,
} from '../schemas/cameraShot.schema';
import type { ConditionData } from '../schemas/condition.schema';
import { DeliveryEndpointComponentSchema } from '../schemas/component.schema';
import type { EventData } from '../schemas/event.schema';
import type { LevelData } from '../schemas/level.schema';
import type { PaletteData } from '../schemas/palette.schema';
import type { PrefabData } from '../schemas/prefab.schema';
import { RenderStyleSchema, type RenderStyleData } from '../schemas/renderStyle.schema';
import type { TimelineData, TimelineTrackData } from '../schemas/timeline.schema';
import type { MaterialParameterValue, MaterialRegistry } from '../runtime/materials';
import type { RenderableMaterialSlotsData } from '../schemas/material.schema';
import {
  getComponentPayload,
  getRenderableMaterials,
  getRenderableModelAssetId,
} from './projectDataSelectors';

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
  palettes?: readonly PaletteData[];
  cameraShots?: readonly CameraShotData[];
  events?: readonly EventData[];
  timelines?: readonly TimelineData[];
  materialRegistry: MaterialRegistry;
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
  const palettesById = new Map((input.palettes ?? []).map((palette) => [palette.id, palette]));
  const entityIds = new Set<string>();
  const regionIds = new Set<string>();
  const entityMaterialSlots = new Map<string, RenderableMaterialSlotsData>();
  const entityModelAssetIds = new Map<string, string>();

  addLodGroupAssetReferenceIssues(input.assets, assetIds, issues);

  addDuplicateIdIssues(
    input.prefabs.map((prefab) => prefab.id),
    'data/prefabs',
    'prefab',
    issues,
  );

  for (const prefab of input.prefabs) {
    prefabIds.add(prefab.id);
    addMissingAssetIssue(prefab.model, assetIds, `data/prefabs/${prefab.id}.json.model`, issues);
    addAssetTypeIssue(
      prefab.model,
      input.assets,
      'model',
      `data/prefabs/${prefab.id}.json.model`,
      issues,
    );
    addMissingAssetIssue(
      getPrefabRenderableModel(prefab),
      assetIds,
      `data/prefabs/${prefab.id}.json.components.Renderable.model`,
      issues,
    );
    addAssetTypeIssue(
      getPrefabRenderableModel(prefab),
      input.assets,
      'model',
      `data/prefabs/${prefab.id}.json.components.Renderable.model`,
      issues,
    );
    addRenderableStyleIssues(
      prefab.components.Renderable,
      palettesById,
      `data/prefabs/${prefab.id}.json.components.Renderable.renderStyle`,
      issues,
    );
    addRenderableMaterialIssues(
      prefab.components.Renderable,
      input.materialRegistry,
      input.assets,
      `data/prefabs/${prefab.id}.json.components.Renderable.materials`,
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
    const scatterGroups = level.scatterGroups ?? [];
    const deliveryJobs = level.deliveryJobs ?? [];
    const regions = level.worldProjection?.regions ?? [];
    const levelRegionIds = new Set(regions.map((region) => region.id));
    const scatterGroupIds = new Set(scatterGroups.map((group) => group.id));
    const deliveryEndpointIds = new Set<string>();
    const duplicateDeliveryEndpointIds = new Set<string>();

    regions.forEach((region) => regionIds.add(region.id));

    addDuplicateIdIssues(
      level.entities.map((entity) => entity.id),
      `data/levels/${level.id}.json.entities`,
      'entity',
      issues,
    );
    addDuplicateIdIssues(
      scatterGroups.map((group) => group.id),
      `data/levels/${level.id}.json.scatterGroups`,
      'scatter group',
      issues,
    );
    addDuplicateIdIssues(
      regions.map((region) => region.id),
      `data/levels/${level.id}.json.worldProjection.regions`,
      'region',
      issues,
    );
    addWorldProjectionReferenceIssues(level, scatterGroupIds, input.assets, issues);

    const project = {
      assets: input.assets,
      level,
      prefabs: Object.fromEntries(input.prefabs.map((prefab) => [prefab.id, prefab])),
    };

    for (const entity of level.entities) {
      entityIds.add(entity.id);

      if (entity.prefab && !prefabIds.has(entity.prefab)) {
        issues.push({
          severity: 'error',
          path: `data/levels/${level.id}.json.entities.${entity.id}.prefab`,
          message: `Missing prefab "${entity.prefab}".`,
        });
      }

      addEntityPlacementReferenceIssues(entity, level, levelRegionIds, issues);

      const modelAssetId = getRenderableModelAssetId(project, entity);
      if (modelAssetId) {
        entityModelAssetIds.set(entity.id, modelAssetId);
      }

      const renderableMaterials = getRenderableMaterials(project, entity);
      if (renderableMaterials) {
        entityMaterialSlots.set(entity.id, renderableMaterials);
      }

      addMissingAssetIssue(
        modelAssetId,
        assetIds,
        `data/levels/${level.id}.json.entities.${entity.id}.components.Renderable.model`,
        issues,
      );
      addAssetTypeIssue(
        modelAssetId,
        input.assets,
        'model',
        `data/levels/${level.id}.json.entities.${entity.id}.components.Renderable.model`,
        issues,
      );
      addRenderableStyleIssues(
        getComponentPayload(entity.components, 'Renderable'),
        palettesById,
        `data/levels/${level.id}.json.entities.${entity.id}.components.Renderable.renderStyle`,
        issues,
      );
      addRenderableMaterialIssues(
        getComponentPayload(entity.components, 'Renderable'),
        input.materialRegistry,
        input.assets,
        `data/levels/${level.id}.json.entities.${entity.id}.components.Renderable.materials`,
        issues,
      );

      addDeliveryEndpointComponentIssues(
        entity,
        level,
        deliveryEndpointIds,
        duplicateDeliveryEndpointIds,
        issues,
      );
    }

    for (const endpointId of duplicateDeliveryEndpointIds) {
      issues.push({
        severity: 'error',
        path: `data/levels/${level.id}.json.entities.components.DeliveryEndpoint`,
        message: `Duplicate delivery endpoint id "${endpointId}".`,
      });
    }

    addDeliveryJobReferenceIssues(level, deliveryJobs, deliveryEndpointIds, levelRegionIds, issues);

    for (const scatterGroup of scatterGroups) {
      addScatterGroupReferenceIssues(
        scatterGroup,
        `data/levels/${level.id}.json.scatterGroups.${scatterGroup.id}`,
        input,
        prefabIds,
        assetIds,
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

  if (input.events) {
    addDuplicateIdIssues(
      input.events.map((event) => event.id),
      'data/events',
      'event',
      issues,
    );

    for (const event of input.events) {
      addEventTriggerReferenceIssues(event, entityIds, input.availableTimelineIds, issues);
      event.actions.forEach((action, index) =>
        addActionReferenceIssues(
          action,
          `data/events/${event.id}.json.actions.${index}`,
          input,
          entityIds,
          entityModelAssetIds,
          entityMaterialSlots,
          assetIds,
          issues,
        ),
      );

      if (event.condition) {
        addConditionReferenceIssues(
          event.condition,
          `data/events/${event.id}.json.condition`,
          entityIds,
          issues,
        );
      }
    }
  }

  if (input.timelines) {
    addDuplicateIdIssues(
      input.timelines.map((timeline) => timeline.id),
      'data/timelines',
      'timeline',
      issues,
    );

    for (const timeline of input.timelines) {
      addDuplicateIdIssues(
        timeline.tracks.map((track) => track.id),
        `data/timelines/${timeline.id}.json.tracks`,
        'timeline track',
        issues,
      );

      for (const track of timeline.tracks) {
        addTimelineTrackReferenceIssues(
          track,
          `data/timelines/${timeline.id}.json.tracks.${track.id}`,
          input,
          entityIds,
          entityModelAssetIds,
          entityMaterialSlots,
          assetIds,
          issues,
        );
      }
    }
  }

  if (input.cameraShots) {
    addDuplicateIdIssues(
      input.cameraShots.map((shot) => shot.id),
      'data/cameraShots',
      'camera shot',
      issues,
    );

    for (const shot of input.cameraShots) {
      addCameraShotReferenceIssues(shot, entityIds, regionIds, issues);
    }
  }

  return issues;
}

function addWorldProjectionReferenceIssues(
  level: LevelData,
  scatterGroupIds: ReadonlySet<string>,
  assets: AssetManifestData,
  issues: ReferenceValidationIssue[],
): void {
  const projection = level.worldProjection;

  if (!projection) {
    return;
  }

  for (const region of projection.regions) {
    const path = `data/levels/${level.id}.json.worldProjection.regions.${region.id}`;

    if (region.lodGroup && !assets.lodGroups?.[region.lodGroup]) {
      issues.push({
        severity: 'error',
        path: `${path}.lodGroup`,
        message: `Missing LOD group "${region.lodGroup}".`,
      });
    }

    if (region.scatterGroup && !scatterGroupIds.has(region.scatterGroup)) {
      issues.push({
        severity: 'error',
        path: `${path}.scatterGroup`,
        message: `Missing scatter group "${region.scatterGroup}".`,
      });
    }
  }
}

function addEntityPlacementReferenceIssues(
  entity: LevelData['entities'][number],
  level: LevelData,
  regionIds: ReadonlySet<string>,
  issues: ReferenceValidationIssue[],
): void {
  const placement = entity.placement;

  if (!placement) {
    return;
  }

  const path = `data/levels/${level.id}.json.entities.${entity.id}.placement`;

  if (!level.worldProjection) {
    issues.push({
      severity: 'error',
      path,
      message: `Entity "${entity.id}" uses spherical placement but level "${level.id}" has no worldProjection.`,
    });
    return;
  }

  if (!regionIds.has(placement.region)) {
    issues.push({
      severity: 'error',
      path: `${path}.region`,
      message: `Missing region "${placement.region}".`,
    });
  }
}

function addDeliveryEndpointComponentIssues(
  entity: LevelData['entities'][number],
  level: LevelData,
  endpointIds: Set<string>,
  duplicateEndpointIds: Set<string>,
  issues: ReferenceValidationIssue[],
): void {
  if (!Object.hasOwn(entity.components, 'DeliveryEndpoint')) {
    return;
  }

  const path = `data/levels/${level.id}.json.entities.${entity.id}.components.DeliveryEndpoint`;
  const result = DeliveryEndpointComponentSchema.safeParse(entity.components.DeliveryEndpoint);

  if (!result.success) {
    issues.push({
      severity: 'error',
      path,
      message: `Invalid DeliveryEndpoint component: ${formatZodIssues(result.error.issues)}.`,
    });
    return;
  }

  if (endpointIds.has(result.data.endpointId)) {
    duplicateEndpointIds.add(result.data.endpointId);
  }

  endpointIds.add(result.data.endpointId);
}

function addDeliveryJobReferenceIssues(
  level: LevelData,
  deliveryJobs: readonly NonNullable<LevelData['deliveryJobs']>[number][],
  endpointIds: ReadonlySet<string>,
  regionIds: ReadonlySet<string>,
  issues: ReferenceValidationIssue[],
): void {
  addDuplicateIdIssues(
    deliveryJobs.map((job) => job.id),
    `data/levels/${level.id}.json.deliveryJobs`,
    'delivery job',
    issues,
  );

  for (const job of deliveryJobs) {
    const path = `data/levels/${level.id}.json.deliveryJobs.${job.id}`;

    addMissingDeliveryEndpointReference(
      job.acceptEndpointId,
      endpointIds,
      `${path}.acceptEndpointId`,
      issues,
    );
    addMissingDeliveryEndpointReference(
      job.targetEndpointId,
      endpointIds,
      `${path}.targetEndpointId`,
      issues,
    );

    if (job.acceptEndpointId === job.targetEndpointId) {
      issues.push({
        severity: 'error',
        path: `${path}.targetEndpointId`,
        message: `Delivery job "${job.id}" accept and target endpoints must be different.`,
      });
    }

    addMissingDeliveryEndpointReference(
      job.completion.endpointId,
      endpointIds,
      `${path}.completion.endpointId`,
      issues,
    );

    if (job.completion.endpointId !== job.targetEndpointId) {
      issues.push({
        severity: 'error',
        path: `${path}.completion.endpointId`,
        message: `Delivery job "${job.id}" completion endpoint must match target endpoint "${job.targetEndpointId}".`,
      });
    }

    job.routeHints.forEach((hint, index) => {
      const hintPath = `${path}.routeHints.${index}`;

      if (hint.type === 'endpoint') {
        addMissingDeliveryEndpointReference(
          hint.endpointId,
          endpointIds,
          `${hintPath}.endpointId`,
          issues,
        );
        return;
      }

      if (!level.worldProjection) {
        issues.push({
          severity: 'error',
          path: hintPath,
          message: `Delivery job "${job.id}" route hint uses spherical region but level "${level.id}" has no worldProjection.`,
        });
        return;
      }

      if (!regionIds.has(hint.region)) {
        issues.push({
          severity: 'error',
          path: `${hintPath}.region`,
          message: `Missing delivery route region "${hint.region}".`,
        });
      }
    });
  }
}

function addMissingDeliveryEndpointReference(
  endpointId: string,
  endpointIds: ReadonlySet<string>,
  path: string,
  issues: ReferenceValidationIssue[],
): void {
  if (endpointIds.has(endpointId)) {
    return;
  }

  issues.push({
    severity: 'error',
    path,
    message: `Missing delivery endpoint "${endpointId}".`,
  });
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

function addActionReferenceIssues(
  action: ActionData,
  path: string,
  input: ReferenceValidationInput,
  entityIds: ReadonlySet<string>,
  entityModelAssetIds: ReadonlyMap<string, string>,
  entityMaterialSlots: ReadonlyMap<string, RenderableMaterialSlotsData>,
  assetIds: ReadonlySet<string>,
  issues: ReferenceValidationIssue[],
): void {
  switch (action.type) {
    case 'entity.setVisible':
    case 'entity.setEnabled':
    case 'entity.setTransform':
    case 'entity.animateTransform':
    case 'switch.setState':
    case 'door.open':
    case 'door.close':
      addMissingEntityReference(action.entityId, entityIds, `${path}.entityId`, 'entity', issues);
      break;
    case 'timeline.play':
    case 'timeline.stop':
      addMissingSetReferences(
        [action.timelineId],
        input.availableTimelineIds,
        `${path}.timelineId`,
        'timeline',
        issues,
      );
      break;
    case 'camera.playShot':
      addMissingSetReferences(
        [action.shotId],
        input.availableCameraShotIds,
        `${path}.shotId`,
        'camera shot',
        issues,
      );
      break;
    case 'animation.play':
      addMissingEntityReference(action.entityId, entityIds, `${path}.entityId`, 'entity', issues);
      addAnimationClipReferenceIssue(
        action.entityId,
        action.clip,
        `${path}.clip`,
        input.assets,
        entityModelAssetIds,
        issues,
      );
      break;
    case 'animation.stop':
      addMissingEntityReference(action.entityId, entityIds, `${path}.entityId`, 'entity', issues);
      if (action.clip) {
        addAnimationClipReferenceIssue(
          action.entityId,
          action.clip,
          `${path}.clip`,
          input.assets,
          entityModelAssetIds,
          issues,
        );
      }
      break;
    case 'sound.play':
      addMissingAssetIssue(action.soundId, assetIds, `${path}.soundId`, issues);
      addAssetTypeIssue(action.soundId, input.assets, 'audio', `${path}.soundId`, issues);
      break;
    case 'material.setParameter':
      addMaterialSetParameterActionIssues(
        action,
        path,
        input.materialRegistry,
        entityIds,
        entityMaterialSlots,
        issues,
      );
      break;
    case 'subtitle.show':
      if (action.speaker) {
        addMissingEntityReference(action.speaker, entityIds, `${path}.speaker`, 'speaker', issues);
      }
      break;
    case 'flag.set':
    case 'flag.toggle':
    case 'function.call':
      break;
  }
}

function addConditionReferenceIssues(
  condition: ConditionData,
  path: string,
  entityIds: ReadonlySet<string>,
  issues: ReferenceValidationIssue[],
): void {
  if ('all' in condition) {
    condition.all.forEach((child, index) =>
      addConditionReferenceIssues(child, `${path}.all.${index}`, entityIds, issues),
    );
    return;
  }

  if ('any' in condition) {
    condition.any.forEach((child, index) =>
      addConditionReferenceIssues(child, `${path}.any.${index}`, entityIds, issues),
    );
    return;
  }

  if ('not' in condition) {
    addConditionReferenceIssues(condition.not, `${path}.not`, entityIds, issues);
    return;
  }

  if (condition.type === 'entity.stateEquals') {
    addMissingEntityReference(condition.entityId, entityIds, `${path}.entityId`, 'entity', issues);
    return;
  }

  if (condition.type === 'distance.lessThan') {
    addMissingEntityReference(condition.entityA, entityIds, `${path}.entityA`, 'entity', issues);
    addMissingEntityReference(condition.entityB, entityIds, `${path}.entityB`, 'entity', issues);
  }
}

function addTimelineTrackReferenceIssues(
  track: TimelineTrackData,
  path: string,
  input: ReferenceValidationInput,
  entityIds: ReadonlySet<string>,
  entityModelAssetIds: ReadonlyMap<string, string>,
  entityMaterialSlots: ReadonlyMap<string, RenderableMaterialSlotsData>,
  assetIds: ReadonlySet<string>,
  issues: ReferenceValidationIssue[],
): void {
  switch (track.type) {
    case 'action':
      addActionReferenceIssues(
        track.action,
        `${path}.action`,
        input,
        entityIds,
        entityModelAssetIds,
        entityMaterialSlots,
        assetIds,
        issues,
      );
      break;
    case 'animation.play':
      addMissingEntityReference(track.entityId, entityIds, `${path}.entityId`, 'entity', issues);
      addAnimationClipReferenceIssue(
        track.entityId,
        track.clip,
        `${path}.clip`,
        input.assets,
        entityModelAssetIds,
        issues,
      );
      break;
    case 'camera.shot':
      addMissingSetReferences(
        [track.shotId],
        input.availableCameraShotIds,
        `${path}.shotId`,
        'camera shot',
        issues,
      );
      break;
    case 'property':
      addMissingEntityReference(track.target, entityIds, `${path}.target`, 'entity', issues);
      break;
    case 'material.parameter':
      track.keys.forEach((key, index) =>
        addMaterialParameterReferenceIssues(
          {
            entityId: track.target,
            slot: track.slot,
            parameter: track.parameter,
            value: key.value,
          },
          path,
          `${path}.target`,
          `${path}.keys.${index}`,
          input.materialRegistry,
          entityIds,
          entityMaterialSlots,
          issues,
        ),
      );
      break;
    case 'sound':
      addMissingAssetIssue(track.soundId, assetIds, `${path}.soundId`, issues);
      addAssetTypeIssue(track.soundId, input.assets, 'audio', `${path}.soundId`, issues);
      break;
    case 'subtitle':
      if (track.speaker) {
        addMissingEntityReference(track.speaker, entityIds, `${path}.speaker`, 'speaker', issues);
      }
      break;
    case 'wait':
      break;
  }
}

function addMaterialSetParameterActionIssues(
  action: Extract<ActionData, { type: 'material.setParameter' }>,
  path: string,
  materialRegistry: MaterialRegistry,
  entityIds: ReadonlySet<string>,
  entityMaterialSlots: ReadonlyMap<string, RenderableMaterialSlotsData>,
  issues: ReferenceValidationIssue[],
): void {
  addMaterialParameterReferenceIssues(
    action,
    path,
    `${path}.entityId`,
    path,
    materialRegistry,
    entityIds,
    entityMaterialSlots,
    issues,
  );
}

function addMaterialParameterReferenceIssues(
  reference: {
    entityId: string;
    slot: string;
    parameter: string;
    value: MaterialParameterValue;
  },
  targetPath: string,
  entityPath: string,
  valuePath: string,
  materialRegistry: MaterialRegistry,
  entityIds: ReadonlySet<string>,
  entityMaterialSlots: ReadonlyMap<string, RenderableMaterialSlotsData>,
  issues: ReferenceValidationIssue[],
): void {
  addMissingEntityReference(reference.entityId, entityIds, entityPath, 'entity', issues);

  if (!supportedRenderableMaterialSlots.has(reference.slot)) {
    issues.push({
      severity: 'error',
      path: `${targetPath}.slot`,
      message: `Unsupported renderable material slot "${reference.slot}". Supported slots: main.`,
    });
    return;
  }

  const materialSlot = entityMaterialSlots.get(reference.entityId)?.[reference.slot];

  if (!materialSlot) {
    issues.push({
      severity: 'error',
      path: `${targetPath}.slot`,
      message: `Entity "${reference.entityId}" does not define renderable material slot "${reference.slot}".`,
    });
    return;
  }

  for (const issue of materialRegistry.validateParameters(materialSlot.materialId, {
    [reference.parameter]: reference.value,
  })) {
    issues.push({
      severity: 'error',
      path: getMaterialParameterReferenceIssuePath(targetPath, valuePath, issue),
      message: issue.message,
    });
  }
}

function getMaterialParameterReferenceIssuePath(
  targetPath: string,
  valuePath: string,
  issue: { path: string; message: string },
): string {
  const issuePath = issue.path;

  if (issuePath === 'materialId') {
    return `${targetPath}.slot`;
  }

  if (issuePath.startsWith('parameters.')) {
    return issue.message.startsWith('Unknown material parameter')
      ? `${targetPath}.parameter`
      : `${valuePath}.value`;
  }

  return `${targetPath}.${issuePath}`;
}

function addCameraShotReferenceIssues(
  shot: CameraShotData,
  entityIds: ReadonlySet<string>,
  regionIds: ReadonlySet<string>,
  issues: ReferenceValidationIssue[],
): void {
  const path = `data/cameraShots/${shot.id}.json`;

  if (shot.type === 'follow') {
    addMissingEntityReference(shot.target, entityIds, `${path}.target`, 'camera target', issues);
    return;
  }

  if (shot.type === 'lookAt') {
    addCameraPointReferenceIssue(shot.position, regionIds, `${path}.position`, issues);
    addCameraLookAtReferenceIssue(shot.target, entityIds, regionIds, `${path}.target`, issues);
    return;
  }

  if (shot.type === 'static') {
    addCameraPointReferenceIssue(shot.pose.position, regionIds, `${path}.pose.position`, issues);
    addCameraLookAtReferenceIssue(
      shot.pose.lookAt,
      entityIds,
      regionIds,
      `${path}.pose.lookAt`,
      issues,
    );
    return;
  }

  shot.keys.forEach((key, index) => {
    addCameraPointReferenceIssue(key.position, regionIds, `${path}.keys.${index}.position`, issues);
    addCameraLookAtReferenceIssue(
      key.lookAt,
      entityIds,
      regionIds,
      `${path}.keys.${index}.lookAt`,
      issues,
    );
  });
}

function addCameraLookAtReferenceIssue(
  lookAt: CameraLookAtData | undefined,
  entityIds: ReadonlySet<string>,
  regionIds: ReadonlySet<string>,
  path: string,
  issues: ReferenceValidationIssue[],
): void {
  if (!lookAt) {
    return;
  }

  if (Array.isArray(lookAt)) {
    return;
  }

  if (isSphericalCameraPoint(lookAt)) {
    addCameraPointReferenceIssue(lookAt, regionIds, path, issues);
    return;
  }

  addMissingEntityReference(lookAt, entityIds, path, 'camera lookAt target', issues);
}

function addCameraPointReferenceIssue(
  point: CameraPointData,
  regionIds: ReadonlySet<string>,
  path: string,
  issues: ReferenceValidationIssue[],
): void {
  if (Array.isArray(point)) {
    return;
  }

  if (regionIds.has(point.region)) {
    return;
  }

  issues.push({
    severity: 'error',
    path: `${path}.region`,
    message: `Missing camera spherical region "${point.region}".`,
  });
}

function isSphericalCameraPoint(value: CameraLookAtData): value is SphericalCameraPointData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function addAssetTypeIssue(
  assetId: string | undefined,
  assets: AssetManifestData,
  expectedType: string,
  path: string,
  issues: ReferenceValidationIssue[],
): void {
  if (!assetId) {
    return;
  }

  const asset = assets.assets[assetId];

  if (!asset || asset.type === expectedType) {
    return;
  }

  issues.push({
    severity: 'error',
    path,
    message: `Asset "${assetId}" must be type "${expectedType}", got "${asset.type}".`,
  });
}

function addLodGroupAssetReferenceIssues(
  assets: AssetManifestData,
  assetIds: ReadonlySet<string>,
  issues: ReferenceValidationIssue[],
): void {
  if (!assets.lodGroups) {
    return;
  }

  for (const [groupId, group] of Object.entries(assets.lodGroups)) {
    const groupPath = `data/assets.manifest.json.lodGroups.${groupId}`;

    addMissingAssetIssue(group.fallbackAsset, assetIds, `${groupPath}.fallbackAsset`, issues);
    addAssetTypeIssue(group.fallbackAsset, assets, 'model', `${groupPath}.fallbackAsset`, issues);

    group.levels.forEach((level, index) => {
      const levelAssetPath = `${groupPath}.levels.${index}.asset`;

      addMissingAssetIssue(level.asset, assetIds, levelAssetPath, issues);
      addAssetTypeIssue(level.asset, assets, 'model', levelAssetPath, issues);
    });
  }
}

function addScatterGroupReferenceIssues(
  scatterGroup: NonNullable<LevelData['scatterGroups']>[number],
  path: string,
  input: ReferenceValidationInput,
  prefabIds: ReadonlySet<string>,
  assetIds: ReadonlySet<string>,
  issues: ReferenceValidationIssue[],
): void {
  if (scatterGroup.source.type === 'asset') {
    addMissingAssetIssue(scatterGroup.source.asset, assetIds, `${path}.source.asset`, issues);
    addAssetTypeIssue(
      scatterGroup.source.asset,
      input.assets,
      'model',
      `${path}.source.asset`,
      issues,
    );
  } else if (!prefabIds.has(scatterGroup.source.prefab)) {
    issues.push({
      severity: 'error',
      path: `${path}.source.prefab`,
      message: `Missing prefab "${scatterGroup.source.prefab}".`,
    });
  }

  if (scatterGroup.fallback?.asset) {
    addMissingAssetIssue(scatterGroup.fallback.asset, assetIds, `${path}.fallback.asset`, issues);
    addAssetTypeIssue(
      scatterGroup.fallback.asset,
      input.assets,
      'model',
      `${path}.fallback.asset`,
      issues,
    );
  }

  const lodGroup = scatterGroup.quality?.lodGroup;
  if (lodGroup && !input.assets.lodGroups?.[lodGroup]) {
    issues.push({
      severity: 'error',
      path: `${path}.quality.lodGroup`,
      message: `Missing LOD group "${lodGroup}".`,
    });
  }
}

function addAnimationClipReferenceIssue(
  entityId: string,
  clip: string,
  path: string,
  assets: AssetManifestData,
  entityModelAssetIds: ReadonlyMap<string, string>,
  issues: ReferenceValidationIssue[],
): void {
  const assetId = entityModelAssetIds.get(entityId);
  const clips = assetId ? getModelClipMetadata(assets, assetId) : undefined;

  if (!assetId || !clips || clips.has(clip)) {
    return;
  }

  issues.push({
    severity: 'error',
    path,
    message: `Animation clip "${clip}" is not listed in metadata.clips for asset "${assetId}".`,
  });
}

function getModelClipMetadata(
  assets: AssetManifestData,
  assetId: string,
): ReadonlySet<string> | undefined {
  const clips = assets.assets[assetId]?.metadata?.clips;

  if (!Array.isArray(clips) || !clips.every((clip) => typeof clip === 'string')) {
    return undefined;
  }

  return new Set(clips);
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

function addRenderableStyleIssues(
  renderablePayload: unknown,
  palettesById: ReadonlyMap<string, PaletteData>,
  path: string,
  issues: ReferenceValidationIssue[],
): void {
  if (!isRecord(renderablePayload) || !('renderStyle' in renderablePayload)) {
    return;
  }

  const result = RenderStyleSchema.safeParse(renderablePayload.renderStyle);

  if (!result.success) {
    issues.push({
      severity: 'error',
      path,
      message: `Invalid renderStyle: ${formatZodIssues(result.error.issues)}.`,
    });
    return;
  }

  addRenderStylePaletteIssues(result.data, palettesById, path, issues);
}

const supportedRenderableMaterialSlots = new Set(['main']);

function addRenderableMaterialIssues(
  renderablePayload: unknown,
  materialRegistry: MaterialRegistry,
  assets: AssetManifestData,
  path: string,
  issues: ReferenceValidationIssue[],
): void {
  if (!isRecord(renderablePayload) || !('materials' in renderablePayload)) {
    return;
  }

  const materials = renderablePayload.materials;

  if (!isRecord(materials)) {
    return;
  }

  for (const [slotName, slotPayload] of Object.entries(materials)) {
    const slotPath = `${path}.${slotName}`;

    if (!supportedRenderableMaterialSlots.has(slotName)) {
      issues.push({
        severity: 'error',
        path: slotPath,
        message: `Unsupported renderable material slot "${slotName}". Supported slots: main.`,
      });
    }

    if (!isRecord(slotPayload) || typeof slotPayload.materialId !== 'string') {
      continue;
    }

    const parameters = isRecord(slotPayload.parameters)
      ? (slotPayload.parameters as Record<string, MaterialParameterValue>)
      : {};

    for (const issue of materialRegistry.validateParameters(slotPayload.materialId, parameters)) {
      issues.push({
        severity: 'error',
        path: `${slotPath}.${issue.path}`,
        message: issue.message,
      });
    }

    addMaterialTextureReferenceIssues(
      slotPayload.materialId,
      parameters,
      materialRegistry,
      assets,
      slotPath,
      issues,
    );
  }
}

function addMaterialTextureReferenceIssues(
  materialId: string,
  parameters: Readonly<Record<string, MaterialParameterValue>>,
  materialRegistry: MaterialRegistry,
  assets: AssetManifestData,
  slotPath: string,
  issues: ReferenceValidationIssue[],
): void {
  const definition = materialRegistry.get(materialId);

  if (!definition) {
    return;
  }

  for (const [parameterName, parameterDefinition] of Object.entries(definition.parameters)) {
    if (parameterDefinition.type !== 'texture') {
      continue;
    }

    const value = parameters[parameterName];

    if (typeof value !== 'string') {
      continue;
    }

    const asset = assets.assets[value];
    const parameterPath = `${slotPath}.parameters.${parameterName}`;

    if (!asset) {
      issues.push({
        severity: 'error',
        path: parameterPath,
        message: `Missing texture asset "${value}".`,
      });
      continue;
    }

    if (asset.type !== 'texture' && asset.type !== 'image') {
      issues.push({
        severity: 'error',
        path: parameterPath,
        message: `Material texture parameter "${parameterName}" must reference a texture or image asset, got "${asset.type}".`,
      });
    }
  }
}

function addRenderStylePaletteIssues(
  style: RenderStyleData,
  palettesById: ReadonlyMap<string, PaletteData>,
  path: string,
  issues: ReferenceValidationIssue[],
): void {
  if (style.profile === 'palette-toon' && !style.palette) {
    issues.push({
      severity: 'error',
      path: `${path}.palette`,
      message: 'Render style profile "palette-toon" requires a palette.',
    });
  }

  if (style.tone && !style.palette) {
    issues.push({
      severity: 'error',
      path: `${path}.tone`,
      message: `Render style tone "${style.tone}" requires a palette.`,
    });
    return;
  }

  if (!style.palette) {
    return;
  }

  const palette = palettesById.get(style.palette);

  if (!palette) {
    issues.push({
      severity: 'error',
      path: `${path}.palette`,
      message: `Missing palette "${style.palette}".`,
    });
    return;
  }

  if (style.tone && !Object.hasOwn(palette.tones, style.tone)) {
    issues.push({
      severity: 'error',
      path: `${path}.tone`,
      message: `Palette "${style.palette}" is missing tone "${style.tone}".`,
    });
  }
}

function formatZodIssues(issues: readonly { path: PropertyKey[]; message: string }[]): string {
  return issues
    .map((issue) => {
      const issuePath = issue.path.join('.');

      return issuePath ? `${issuePath}: ${issue.message}` : issue.message;
    })
    .join('; ');
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
