import { describe, expect, it } from 'vitest';

import type { CameraShotData } from '../schemas/cameraShot.schema';
import { CameraShotPlayer } from './CameraShotPlayer';

describe('CameraShotPlayer', () => {
  it('samples static shots and resolves entity lookAt', () => {
    const shot: CameraShotData = {
      schemaVersion: 1,
      id: 'cam_static',
      type: 'static',
      pose: {
        position: [1, 2, 3],
        lookAt: 'gate_a',
        fov: 55,
      },
    };
    const player = new CameraShotPlayer({
      getEntityPosition: (entityId) => (entityId === 'gate_a' ? [5, 1, 8] : undefined),
    });

    expect(player.sample(shot, 0)).toEqual({
      position: [1, 2, 3],
      lookAt: [5, 1, 8],
      fov: 55,
      near: undefined,
      far: undefined,
      rotation: undefined,
    });
  });

  it('interpolates keyframed positions, fov, and lookAt vectors', () => {
    const shot: CameraShotData = {
      schemaVersion: 1,
      id: 'cam_gate_reveal',
      type: 'keyframed',
      duration: 2,
      keys: [
        {
          time: 0,
          position: [0, 1, 2],
          lookAt: [0, 0, 0],
          fov: 60,
        },
        {
          time: 2,
          position: [2, 3, 4],
          lookAt: [2, 0, 0],
          fov: 40,
        },
      ],
    };

    expect(new CameraShotPlayer().sample(shot, 1)).toMatchObject({
      position: [1, 2, 3],
      lookAt: [1, 0, 0],
      fov: 50,
    });
  });

  it('applies easing from the next key', () => {
    const shot: CameraShotData = {
      schemaVersion: 1,
      id: 'cam_eased',
      type: 'keyframed',
      duration: 2,
      keys: [
        { time: 0, position: [0, 0, 0], fov: 50 },
        { time: 2, position: [2, 0, 0], fov: 70, ease: 'easeInCubic' },
      ],
    };

    expect(new CameraShotPlayer().sample(shot, 1)).toMatchObject({
      position: [0.25, 0, 0],
      fov: 52.5,
    });
  });
});
