import { runDexieSmoke } from "./dexie/dexie-smoke";
import { runRapierSmoke } from "./rapier/rapier-smoke";
import { runRecastNavigationSmoke } from "./recast/recast-smoke";
import { runSpectorSmoke } from "./spector/spector-smoke";
import { runWebAudioSmoke } from "./web-audio/web-audio-smoke";
import { runAudioSystemBrowserSmoke } from "./audio-system/audio-system-browser-smoke";
import { runPhysicsAdapterBrowserSmoke } from "./physics-adapter/physics-adapter-browser-smoke";
import { runComlinkBrowserSmoke } from "./workers/comlink-smoke";
import { runStorageAdapterBrowserSmoke } from "./storage-adapter/storage-adapter-browser-smoke";
import { runWorkerTaskAdapterBrowserSmoke } from "./worker-task/worker-task-browser-smoke";

export const matureDependencySmokeCatalog = {
  rapier: runRapierSmoke,
  webAudio: runWebAudioSmoke,
  audioSystem: runAudioSystemBrowserSmoke,
  physicsAdapter: runPhysicsAdapterBrowserSmoke,
  dexie: runDexieSmoke,
  storageAdapter: runStorageAdapterBrowserSmoke,
  workerTaskAdapter: runWorkerTaskAdapterBrowserSmoke,
  spector: runSpectorSmoke,
  comlink: runComlinkBrowserSmoke,
  recast: runRecastNavigationSmoke
};

if (typeof window !== "undefined") {
  Object.assign(window, {
    sinanMatureDependencySmokeCatalog: matureDependencySmokeCatalog
  });
}
