import { init, NavMeshQuery } from "recast-navigation";
import { generateSoloNavMesh, soloNavMeshGeneratorConfigDefaults } from "recast-navigation/generators";

export interface RecastNavigationSmokeResult {
  initialized: boolean;
  navMeshGenerated: boolean;
  pathPointCount: number;
  closestPointOverPoly: boolean;
  adapterBoundary: string;
  error?: string;
}

export async function runRecastNavigationSmoke(): Promise<RecastNavigationSmokeResult> {
  await init();

  const positions = [-10, 0, -10, 10, 0, -10, 10, 0, 10, -10, 0, 10];
  const indices = [0, 2, 1, 0, 3, 2];
  const result = generateSoloNavMesh(positions, indices, {
    ...soloNavMeshGeneratorConfigDefaults,
    bounds: [
      [-11, -1, -11],
      [11, 2, 11]
    ],
    cs: 0.2,
    ch: 0.2,
    walkableHeight: 1,
    walkableRadius: 0,
    walkableClimb: 1,
    minRegionArea: 0,
    mergeRegionArea: 0
  });

  if (!result.success) {
    return {
      initialized: true,
      navMeshGenerated: false,
      pathPointCount: 0,
      closestPointOverPoly: false,
      adapterBoundary: "Sinan NavigationAdapter contract -> recast-navigation-js -> Detour query",
      error: result.error
    };
  }

  const query = new NavMeshQuery(result.navMesh);
  const path = query.computePath({ x: -5, y: 0, z: -5 }, { x: 5, y: 0, z: 5 });
  const closestPoint = query.findClosestPoint({ x: 0, y: 0, z: 0 });

  return {
    initialized: true,
    navMeshGenerated: true,
    pathPointCount: path.success ? path.path.length : 0,
    closestPointOverPoly: closestPoint.success ? closestPoint.isPointOverPoly : false,
    adapterBoundary: "Sinan NavigationAdapter contract -> recast-navigation-js -> Detour query"
  };
}
