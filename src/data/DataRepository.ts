import type { AssetManifestData } from '../schemas/asset.schema';
import { AssetManifestSchema } from '../schemas/asset.schema';
import type { CameraShotData } from '../schemas/cameraShot.schema';
import { CameraShotSchema } from '../schemas/cameraShot.schema';
import type { EventData } from '../schemas/event.schema';
import { EventSchema } from '../schemas/event.schema';
import type { LevelData } from '../schemas/level.schema';
import { LevelSchema } from '../schemas/level.schema';
import type { PaletteData } from '../schemas/palette.schema';
import { PaletteSchema } from '../schemas/palette.schema';
import type { PrefabData } from '../schemas/prefab.schema';
import { PrefabSchema } from '../schemas/prefab.schema';
import type { TimelineData } from '../schemas/timeline.schema';
import { TimelineSchema } from '../schemas/timeline.schema';
import { FetchJsonLoader, loadAndParseJson, type ProjectJsonLoader } from './loadJson';
import { getRenderableRenderStyle } from './projectDataSelectors';

export interface ProjectData {
  assets: AssetManifestData;
  level: LevelData;
  prefabs: Record<string, PrefabData>;
  palettes: Record<string, PaletteData>;
  events: Record<string, EventData>;
  timelines: Record<string, TimelineData>;
  cameraShots: Record<string, CameraShotData>;
}

export class DataRepository {
  constructor(private readonly loader: ProjectJsonLoader = new FetchJsonLoader()) {}

  loadAssetManifest(path = 'data/assets.manifest.json'): Promise<AssetManifestData> {
    return loadAndParseJson(this.loader, path, AssetManifestSchema);
  }

  loadPrefab(prefabId: string): Promise<PrefabData> {
    return loadAndParseJson(this.loader, `data/prefabs/${prefabId}.json`, PrefabSchema);
  }

  loadPalette(paletteId: string): Promise<PaletteData> {
    return loadAndParseJson(this.loader, `data/palettes/${paletteId}.json`, PaletteSchema);
  }

  loadLevel(levelId: string): Promise<LevelData> {
    return loadAndParseJson(this.loader, `data/levels/${levelId}.json`, LevelSchema);
  }

  loadEvent(eventId: string): Promise<EventData> {
    return loadAndParseJson(this.loader, `data/events/${eventId}.json`, EventSchema);
  }

  loadTimeline(timelineId: string): Promise<TimelineData> {
    return loadAndParseJson(this.loader, `data/timelines/${timelineId}.json`, TimelineSchema);
  }

  loadCameraShot(cameraShotId: string): Promise<CameraShotData> {
    return loadAndParseJson(this.loader, `data/cameraShots/${cameraShotId}.json`, CameraShotSchema);
  }

  async loadProjectLevel(levelId: string): Promise<ProjectData> {
    const [assets, level] = await Promise.all([this.loadAssetManifest(), this.loadLevel(levelId)]);
    const prefabIds = Array.from(
      new Set(level.entities.map((entity) => entity.prefab).filter((id) => id !== undefined)),
    );
    const prefabs = await Promise.all(prefabIds.map(async (prefabId) => this.loadPrefab(prefabId)));
    const prefabLookup = Object.fromEntries(prefabs.map((prefab) => [prefab.id, prefab]));
    const paletteIds = collectProjectPaletteIds(level, prefabLookup);
    const palettes = await Promise.all(
      paletteIds.map(async (paletteId) => this.loadPalette(paletteId)),
    );
    const events = await Promise.all(level.events.map(async (eventId) => this.loadEvent(eventId)));
    const timelines = await Promise.all(
      level.timelines.map(async (timelineId) => this.loadTimeline(timelineId)),
    );
    const cameraShots = await Promise.all(
      level.cameraShots.map(async (cameraShotId) => this.loadCameraShot(cameraShotId)),
    );

    return {
      assets,
      level,
      prefabs: prefabLookup,
      palettes: Object.fromEntries(palettes.map((palette) => [palette.id, palette])),
      events: Object.fromEntries(events.map((event) => [event.id, event])),
      timelines: Object.fromEntries(timelines.map((timeline) => [timeline.id, timeline])),
      cameraShots: Object.fromEntries(cameraShots.map((shot) => [shot.id, shot])),
    };
  }
}

function collectProjectPaletteIds(level: LevelData, prefabs: Record<string, PrefabData>): string[] {
  const project = { prefabs };
  const ids = new Set<string>();

  for (const prefab of Object.values(prefabs)) {
    const style = getRenderableRenderStyle(
      { prefabs: {} },
      {
        id: `${prefab.id}:prefab-style`,
        transform: prefab.defaultTransform,
        components: prefab.components,
      },
    );

    if (style?.palette) {
      ids.add(style.palette);
    }
  }

  for (const entity of level.entities) {
    const style = getRenderableRenderStyle(project, entity);

    if (style?.palette) {
      ids.add(style.palette);
    }
  }

  return [...ids].sort((left, right) => left.localeCompare(right));
}
