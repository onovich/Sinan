import { describe, expect, it } from 'vitest';

import assetsManifest from '../../data/assets.manifest.json';
import switchEvent from '../../data/events/ev_switch_a_open_gate.json';
import level01 from '../../data/levels/level_01.json';
import doorWood from '../../data/prefabs/door_wood.json';
import playerSpawn from '../../data/prefabs/player_spawn.json';
import switchWall from '../../data/prefabs/switch_wall.json';
import openGateTimeline from '../../data/timelines/tl_open_gate.json';
import { AssetManifestSchema } from '../schemas/asset.schema';
import { EventSchema } from '../schemas/event.schema';
import { LevelSchema } from '../schemas/level.schema';
import { PrefabSchema } from '../schemas/prefab.schema';
import { TimelineSchema } from '../schemas/timeline.schema';

describe('demo project data', () => {
  it('matches the current core schemas', () => {
    expect(AssetManifestSchema.safeParse(assetsManifest).success).toBe(true);
    expect(PrefabSchema.safeParse(playerSpawn).success).toBe(true);
    expect(PrefabSchema.safeParse(switchWall).success).toBe(true);
    expect(PrefabSchema.safeParse(doorWood).success).toBe(true);
    expect(EventSchema.safeParse(switchEvent).success).toBe(true);
    expect(TimelineSchema.safeParse(openGateTimeline).success).toBe(true);
    expect(LevelSchema.safeParse(level01).success).toBe(true);
  });
});
