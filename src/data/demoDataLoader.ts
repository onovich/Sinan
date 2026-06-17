import assetsManifest from '../../data/assets.manifest.json';
import level01 from '../../data/levels/level_01.json';
import doorWood from '../../data/prefabs/door_wood.json';
import playerSpawn from '../../data/prefabs/player_spawn.json';
import switchWall from '../../data/prefabs/switch_wall.json';
import { DataRepository } from './DataRepository';
import type { ProjectJsonLoader } from './loadJson';

const demoJsonByPath: Record<string, unknown> = {
  'data/assets.manifest.json': assetsManifest,
  'data/levels/level_01.json': level01,
  'data/prefabs/door_wood.json': doorWood,
  'data/prefabs/player_spawn.json': playerSpawn,
  'data/prefabs/switch_wall.json': switchWall,
};

export function createDemoDataRepository(): DataRepository {
  return new DataRepository(createStaticJsonLoader(demoJsonByPath));
}

function createStaticJsonLoader(data: Record<string, unknown>): ProjectJsonLoader {
  return {
    loadJson(path: string) {
      if (!(path in data)) {
        throw new Error(`Demo data is not registered: ${path}`);
      }

      return Promise.resolve(structuredClone(data[path]));
    },
  };
}
