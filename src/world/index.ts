export {
  projectCubeSphereLocal,
  projectSphericalRegion,
  type CubeSphereProjectionInput,
  type SphericalRegionProjectionInput,
  type SphericalSurfaceFrame,
} from './CubeSphereProjection';
export { EntityStore } from './EntityStore';
export {
  deriveSphericalPlacements,
  type SphericalPlacementDerivationInput,
  type SphericalPlacementIssue,
  type SphericalPlacementResult,
  type SphericalPlacementSnapshot,
} from './SphericalPlacement';
export {
  stepSurfaceMovement,
  type SurfaceMovementCommand,
  type SurfaceMovementEdgeStatus,
  type SurfaceMovementOptions,
  type SurfaceMovementResult,
  type SurfaceMovementState,
  type SurfaceMovementStepInput,
} from './SurfaceMovement';
export { World, type WorldSurfaceMovementResult, type WorldTransformResult } from './World';
export type { WorldEntitySnapshot, WorldSnapshot } from './WorldSnapshot';
