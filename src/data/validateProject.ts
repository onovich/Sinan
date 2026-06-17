import type { AssetManifestData } from '../schemas/asset.schema';
import type { LevelData } from '../schemas/level.schema';
import type { PrefabData } from '../schemas/prefab.schema';
import type { ReferenceValidationIssue, ReferenceValidationInput } from './ReferenceResolver';
import { validateProjectReferences } from './ReferenceResolver';

export interface ProjectValidationInput {
  assets: AssetManifestData;
  prefabs: readonly PrefabData[];
  levels: readonly LevelData[];
  availableEventIds?: ReadonlySet<string>;
  availableTimelineIds?: ReadonlySet<string>;
  availableCameraShotIds?: ReadonlySet<string>;
}

export interface ProjectValidationResult {
  issues: ReferenceValidationIssue[];
}

export function validateProject(input: ProjectValidationInput): ProjectValidationResult {
  const referenceInput: ReferenceValidationInput = {
    assets: input.assets,
    prefabs: input.prefabs,
    levels: input.levels,
    availableEventIds: input.availableEventIds,
    availableTimelineIds: input.availableTimelineIds,
    availableCameraShotIds: input.availableCameraShotIds,
  };

  return {
    issues: validateProjectReferences(referenceInput),
  };
}
