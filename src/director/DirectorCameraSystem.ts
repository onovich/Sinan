import type { WebRuntime } from '../runtime/WebRuntime';
import type { RuntimeCameraPose } from '../runtime/RuntimeTypes';
import type { CameraShotData } from '../schemas/cameraShot.schema';
import { CameraShotPlayer, type CameraShotEntityResolver } from './CameraShotPlayer';

export class DirectorCameraSystem {
  private readonly player: CameraShotPlayer;

  constructor(
    private readonly runtime: WebRuntime,
    resolver?: CameraShotEntityResolver,
  ) {
    this.player = new CameraShotPlayer(resolver ?? createRuntimeResolver(runtime));
  }

  applyShot(shot: CameraShotData, time: number): RuntimeCameraPose {
    const pose = this.player.sample(shot, time);

    this.runtime.setCameraPose(pose);
    return pose;
  }
}

function createRuntimeResolver(runtime: WebRuntime): CameraShotEntityResolver {
  return {
    getEntityPosition(entityId) {
      return runtime.getTransform(entityId)?.position;
    },
  };
}
