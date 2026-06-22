import { describe, expect, it } from 'vitest';

import assetsManifest from '../../data/assets.manifest.json';
import gateRevealCameraShot from '../../data/cameraShots/cam_gate_reveal.json';
import gateTriggerEnterEvent from '../../data/events/ev_gate_trigger_enter.json';
import gateTriggerExitEvent from '../../data/events/ev_gate_trigger_exit.json';
import switchEvent from '../../data/events/ev_switch_a_open_gate.json';
import level01 from '../../data/levels/level_01.json';
import world01Palette from '../../data/palettes/world_01.json';
import doorWood from '../../data/prefabs/door_wood.json';
import playerSpawn from '../../data/prefabs/player_spawn.json';
import roomBlockout from '../../data/prefabs/room_blockout.json';
import switchWall from '../../data/prefabs/switch_wall.json';
import triggerBox from '../../data/prefabs/trigger_box.json';
import openGateTimeline from '../../data/timelines/tl_open_gate.json';
import { createDemoDataRepository } from './demoDataLoader';
import { AssetManifestSchema } from '../schemas/asset.schema';
import { CameraShotSchema } from '../schemas/cameraShot.schema';
import { EventSchema } from '../schemas/event.schema';
import { LevelSchema } from '../schemas/level.schema';
import { PaletteSchema } from '../schemas/palette.schema';
import { PrefabSchema } from '../schemas/prefab.schema';
import { TimelineSchema } from '../schemas/timeline.schema';
import { World } from '../world';

describe('demo project data', () => {
  it('matches the current core schemas', () => {
    expect(AssetManifestSchema.safeParse(assetsManifest).success).toBe(true);
    expect(PrefabSchema.safeParse(playerSpawn).success).toBe(true);
    expect(PrefabSchema.safeParse(roomBlockout).success).toBe(true);
    expect(PrefabSchema.safeParse(switchWall).success).toBe(true);
    expect(PrefabSchema.safeParse(doorWood).success).toBe(true);
    expect(PrefabSchema.safeParse(triggerBox).success).toBe(true);
    expect(PaletteSchema.safeParse(world01Palette).success).toBe(true);
    expect(CameraShotSchema.safeParse(gateRevealCameraShot).success).toBe(true);
    expect(EventSchema.safeParse(switchEvent).success).toBe(true);
    expect(EventSchema.safeParse(gateTriggerEnterEvent).success).toBe(true);
    expect(EventSchema.safeParse(gateTriggerExitEvent).success).toBe(true);
    expect(TimelineSchema.safeParse(openGateTimeline).success).toBe(true);
    expect(LevelSchema.safeParse(level01).success).toBe(true);
  });

  it('loads the full demo level through the static registry', async () => {
    const project = await createDemoDataRepository().loadProjectLevel('level_01');

    expect(project.prefabs.trigger_box).toBeDefined();
    expect(project.palettes.world_01).toBeDefined();
    expect(project.events.ev_gate_trigger_enter).toBeDefined();
    expect(project.events.ev_gate_trigger_exit).toBeDefined();
  });

  it('defines compact spherical world regions and source placements', () => {
    const level = LevelSchema.parse(level01);
    const world = World.fromLevel(level);
    const placements = world.getSphericalPlacements();

    expect(level.worldProjection?.type).toBe('cube-sphere');
    expect(level.worldProjection?.regions.map((region) => region.id)).toEqual([
      'city',
      'hill',
      'beach',
    ]);
    expect(new Set(level.entities.map((entity) => entity.placement?.region))).toEqual(
      new Set(['city', 'hill', 'beach']),
    );
    expect(placements.issueCount).toBe(0);
    expect(placements.placementCount).toBe(5);
  });
});
