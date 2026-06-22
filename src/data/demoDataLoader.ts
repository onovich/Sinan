import assetsManifest from '../../data/assets.manifest.json';
import gateRevealCameraShot from '../../data/cameraShots/cam_gate_reveal.json';
import deliveryAcceptEvent from '../../data/events/ev_delivery_accept.json';
import deliveryCompleteEvent from '../../data/events/ev_delivery_complete.json';
import deliveryProgressEvent from '../../data/events/ev_delivery_progress.json';
import deliveryReadyEvent from '../../data/events/ev_delivery_ready.json';
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
import socialAvatars from '../../data/social/avatars.json';
import socialEmotes from '../../data/social/emotes.json';
import socialPresets from '../../data/social/presets.json';
import socialStamps from '../../data/social/stamps.json';
import openGateTimeline from '../../data/timelines/tl_open_gate.json';
import { DataRepository } from './DataRepository';
import type { ProjectJsonLoader } from './loadJson';

const demoJsonByPath: Record<string, unknown> = {
  'data/assets.manifest.json': assetsManifest,
  'data/cameraShots/cam_gate_reveal.json': gateRevealCameraShot,
  'data/events/ev_delivery_accept.json': deliveryAcceptEvent,
  'data/events/ev_delivery_complete.json': deliveryCompleteEvent,
  'data/events/ev_delivery_progress.json': deliveryProgressEvent,
  'data/events/ev_delivery_ready.json': deliveryReadyEvent,
  'data/events/ev_gate_trigger_enter.json': gateTriggerEnterEvent,
  'data/events/ev_gate_trigger_exit.json': gateTriggerExitEvent,
  'data/events/ev_switch_a_open_gate.json': switchEvent,
  'data/levels/level_01.json': level01,
  'data/palettes/world_01.json': world01Palette,
  'data/prefabs/door_wood.json': doorWood,
  'data/prefabs/player_spawn.json': playerSpawn,
  'data/prefabs/room_blockout.json': roomBlockout,
  'data/prefabs/switch_wall.json': switchWall,
  'data/prefabs/trigger_box.json': triggerBox,
  'data/social/avatars.json': socialAvatars,
  'data/social/emotes.json': socialEmotes,
  'data/social/presets.json': socialPresets,
  'data/social/stamps.json': socialStamps,
  'data/timelines/tl_open_gate.json': openGateTimeline,
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
