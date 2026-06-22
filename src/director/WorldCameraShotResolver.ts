import type { World } from '../world';
import type { CameraShotEntityResolver, CameraShotResolvedPoint } from './CameraShotPlayer';
import type { SphericalCameraPointData } from '../schemas/cameraShot.schema';

export function createWorldCameraShotResolver(
  world: World,
  fallback?: CameraShotEntityResolver,
): CameraShotEntityResolver {
  return {
    getEntityPosition(entityId) {
      return world.getRuntimeTransform(entityId)?.position ?? fallback?.getEntityPosition(entityId);
    },
    resolveSphericalPoint(point: SphericalCameraPointData): CameraShotResolvedPoint | undefined {
      const frame = world.resolveSphericalRegionFrame(point);

      if (frame) {
        return {
          position: frame.position,
          up: frame.normal,
        };
      }

      return fallback?.resolveSphericalPoint?.(point);
    },
  };
}
