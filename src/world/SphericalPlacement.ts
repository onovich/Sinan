import type { EntityData } from '../schemas/entity.schema';
import type { WorldProjectionData } from '../schemas/worldProjection.schema';
import type {
  RuntimeSphericalPlacement,
  RuntimeSphericalPlacementDiagnostics,
  RuntimeSphericalPlacementIssue,
} from '../runtime/RuntimeTypes';
import { projectSphericalRegion } from './CubeSphereProjection';

export interface SphericalPlacementDerivationInput {
  entities: readonly EntityData[];
  levelId: string;
  worldProjection?: WorldProjectionData;
}

export type SphericalPlacementSnapshot = RuntimeSphericalPlacementDiagnostics;
export type SphericalPlacementIssue = RuntimeSphericalPlacementIssue;
export type SphericalPlacementResult = RuntimeSphericalPlacement;

export function deriveSphericalPlacements(
  input: SphericalPlacementDerivationInput,
): SphericalPlacementSnapshot {
  const placements: RuntimeSphericalPlacement[] = [];
  const issues: RuntimeSphericalPlacementIssue[] = [];
  const regionsById = new Map(
    (input.worldProjection?.regions ?? []).map((region) => [region.id, region]),
  );

  for (const entity of input.entities) {
    const placement = entity.placement;

    if (!placement) {
      continue;
    }

    if (!input.worldProjection) {
      issues.push({
        entityId: entity.id,
        message: `Entity "${entity.id}" uses spherical placement but level "${input.levelId}" has no worldProjection.`,
        reason: 'missing_world_projection',
        regionId: placement.region,
      });
      continue;
    }

    const region = regionsById.get(placement.region);

    if (!region) {
      issues.push({
        entityId: entity.id,
        message: `Entity "${entity.id}" references missing spherical region "${placement.region}".`,
        reason: 'missing_region',
        regionId: placement.region,
      });
      continue;
    }

    try {
      const authoredLocalPosition = placement.localPosition ?? entity.transform.position;
      const authoredLocalYaw = placement.localYaw ?? 0;
      const surfaceFrame = projectSphericalRegion({
        localPosition: authoredLocalPosition,
        localYaw: authoredLocalYaw,
        radius: input.worldProjection.radius,
        region,
      });

      placements.push({
        authoredLocalPosition: [...authoredLocalPosition],
        authoredLocalYaw,
        entityId: entity.id,
        regionId: region.id,
        surfaceFrame,
        transform: {
          position: surfaceFrame.position,
          rotation: surfaceFrame.rotation,
          scale: [...entity.transform.scale],
        },
      });
    } catch (error) {
      issues.push({
        entityId: entity.id,
        message:
          error instanceof Error
            ? error.message
            : `Failed to derive spherical placement for entity "${entity.id}".`,
        reason: 'invalid_projection',
        regionId: placement.region,
      });
    }
  }

  return {
    issueCount: issues.length,
    issues,
    placementCount: placements.length,
    placements,
  };
}
