import type { AssetManifestData } from '../schemas/asset.schema';
import type { CameraShotData } from '../schemas/cameraShot.schema';
import type { EventData } from '../schemas/event.schema';
import type { LevelData } from '../schemas/level.schema';
import type { PrefabData } from '../schemas/prefab.schema';
import type { TimelineData } from '../schemas/timeline.schema';
import { validateAssetUrls } from './AssetUrlValidator';
import { validateRegistryCoverage } from './RegistryCoverageValidator';
import type { ReferenceValidationIssue, ReferenceValidationInput } from './ReferenceResolver';
import { validateProjectReferences } from './ReferenceResolver';

export interface ProjectValidationInput {
  assets: AssetManifestData;
  prefabs: readonly PrefabData[];
  levels: readonly LevelData[];
  cameraShots?: readonly CameraShotData[];
  events?: readonly EventData[];
  timelines?: readonly TimelineData[];
  availablePublicAssetUrls?: ReadonlySet<string>;
  availableEventIds?: ReadonlySet<string>;
  availableTimelineIds?: ReadonlySet<string>;
  availableCameraShotIds?: ReadonlySet<string>;
  schemaActionTypes?: ReadonlySet<string>;
  schemaConditionTypes?: ReadonlySet<string>;
  registeredActionTypes?: ReadonlySet<string>;
  registeredConditionTypes?: ReadonlySet<string>;
  registeredActionFunctionNames?: ReadonlySet<string>;
  registeredCustomConditionNames?: ReadonlySet<string>;
}

export interface ProjectValidationResult {
  issues: ReferenceValidationIssue[];
}

export function validateProject(input: ProjectValidationInput): ProjectValidationResult {
  const referenceInput: ReferenceValidationInput = {
    assets: input.assets,
    prefabs: input.prefabs,
    levels: input.levels,
    cameraShots: input.cameraShots,
    events: input.events,
    timelines: input.timelines,
    availableEventIds: input.availableEventIds,
    availableTimelineIds: input.availableTimelineIds,
    availableCameraShotIds: input.availableCameraShotIds,
  };

  return {
    issues: [
      ...validateAssetUrls({
        assets: input.assets,
        availablePublicUrls: input.availablePublicAssetUrls,
      }),
      ...validateProjectReferences(referenceInput),
      ...validateRegistryCoverage({
        events: input.events,
        timelines: input.timelines,
        schemaActionTypes: input.schemaActionTypes,
        schemaConditionTypes: input.schemaConditionTypes,
        registeredActionTypes: input.registeredActionTypes,
        registeredConditionTypes: input.registeredConditionTypes,
        registeredActionFunctionNames: input.registeredActionFunctionNames,
        registeredCustomConditionNames: input.registeredCustomConditionNames,
      }),
    ],
  };
}
