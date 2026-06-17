import type { AssetManifestData } from '../schemas/asset.schema';
import { AssetManifestSchema } from '../schemas/asset.schema';
import type { EventData } from '../schemas/event.schema';
import { EventSchema } from '../schemas/event.schema';
import type { LevelData } from '../schemas/level.schema';
import { LevelSchema } from '../schemas/level.schema';
import type { PrefabData } from '../schemas/prefab.schema';
import { PrefabSchema } from '../schemas/prefab.schema';
import { FetchJsonLoader, loadAndParseJson, type ProjectJsonLoader } from './loadJson';

export interface ProjectData {
  assets: AssetManifestData;
  level: LevelData;
  prefabs: Record<string, PrefabData>;
  events: Record<string, EventData>;
}

export class DataRepository {
  constructor(private readonly loader: ProjectJsonLoader = new FetchJsonLoader()) {}

  loadAssetManifest(path = 'data/assets.manifest.json'): Promise<AssetManifestData> {
    return loadAndParseJson(this.loader, path, AssetManifestSchema);
  }

  loadPrefab(prefabId: string): Promise<PrefabData> {
    return loadAndParseJson(this.loader, `data/prefabs/${prefabId}.json`, PrefabSchema);
  }

  loadLevel(levelId: string): Promise<LevelData> {
    return loadAndParseJson(this.loader, `data/levels/${levelId}.json`, LevelSchema);
  }

  loadEvent(eventId: string): Promise<EventData> {
    return loadAndParseJson(this.loader, `data/events/${eventId}.json`, EventSchema);
  }

  async loadProjectLevel(levelId: string): Promise<ProjectData> {
    const [assets, level] = await Promise.all([this.loadAssetManifest(), this.loadLevel(levelId)]);
    const prefabIds = Array.from(
      new Set(level.entities.map((entity) => entity.prefab).filter((id) => id !== undefined)),
    );
    const prefabs = await Promise.all(prefabIds.map(async (prefabId) => this.loadPrefab(prefabId)));
    const events = await Promise.all(level.events.map(async (eventId) => this.loadEvent(eventId)));

    return {
      assets,
      level,
      prefabs: Object.fromEntries(prefabs.map((prefab) => [prefab.id, prefab])),
      events: Object.fromEntries(events.map((event) => [event.id, event])),
    };
  }
}
