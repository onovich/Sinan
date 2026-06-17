import type { AssetManifestData } from '../schemas/asset.schema';
import type { EventData } from '../schemas/event.schema';
import type { LevelData } from '../schemas/level.schema';
import type { PrefabData } from '../schemas/prefab.schema';
import type { TimelineData } from '../schemas/timeline.schema';
import { validateRegistryCoverage } from './RegistryCoverageValidator';
import type { ReferenceValidationIssue, ReferenceValidationInput } from './ReferenceResolver';
import { validateProjectReferences } from './ReferenceResolver';

export interface ProjectValidationInput {
  assets: AssetManifestData;
  prefabs: readonly PrefabData[];
  levels: readonly LevelData[];
  events?: readonly EventData[];
  timelines?: readonly TimelineData[];
  availableEventIds?: ReadonlySet<string>;
  availableTimelineIds?: ReadonlySet<string>;
  availableCameraShotIds?: ReadonlySet<string>;
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
    events: input.events,
    availableEventIds: input.availableEventIds,
    availableTimelineIds: input.availableTimelineIds,
    availableCameraShotIds: input.availableCameraShotIds,
  };

  return {
    issues: [
      ...validateProjectReferences(referenceInput),
      ...validateRegistryCoverage({
        events: input.events,
        timelines: input.timelines,
        registeredActionTypes: input.registeredActionTypes,
        registeredConditionTypes: input.registeredConditionTypes,
        registeredActionFunctionNames: input.registeredActionFunctionNames,
        registeredCustomConditionNames: input.registeredCustomConditionNames,
      }),
    ],
  };
}
