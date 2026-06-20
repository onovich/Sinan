import { runDexieSmoke } from "./dexie/dexie-smoke";
import { runRapierSmoke } from "./rapier/rapier-smoke";
import { runRecastNavigationSmoke } from "./recast/recast-smoke";
import { runSpectorSmoke } from "./spector/spector-smoke";
import { runWebAudioSmoke } from "./web-audio/web-audio-smoke";
import { runComlinkBrowserSmoke } from "./workers/comlink-smoke";

export const matureDependencySmokeCatalog = {
  rapier: runRapierSmoke,
  webAudio: runWebAudioSmoke,
  dexie: runDexieSmoke,
  spector: runSpectorSmoke,
  comlink: runComlinkBrowserSmoke,
  recast: runRecastNavigationSmoke
};

if (typeof window !== "undefined") {
  Object.assign(window, {
    sinanMatureDependencySmokeCatalog: matureDependencySmokeCatalog
  });
}
