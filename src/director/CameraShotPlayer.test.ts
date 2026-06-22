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

  it('resolves spherical camera positions and lookAt points through the spatial resolver', () => {
    const shot: CameraShotData = {
      schemaVersion: 1,
      id: 'cam_spherical',
      type: 'static',
      pose: {
        position: {
          mode: 'spherical-region',
          region: 'city',
          localPosition: [0, 0, 0],
        },
        lookAt: {
          mode: 'spherical-region',
          region: 'beach',
          localPosition: [0, 0, 0],
        },
        fov: 50,
      },
    };
    const player = new CameraShotPlayer({
      getEntityPosition: () => undefined,
      resolveSphericalPoint: (point) =>
        point.region === 'city'
          ? { position: [0, 0, 10], up: [0, 0, 1] }
          : { position: [-10, 0, 0], up: [-1, 0, 0] },
    });

    expect(player.sample(shot, 0)).toEqual({
      far: undefined,
      fov: 50,
      lookAt: [-10, 0, 0],
      near: undefined,
      position: [0, 0, 10],
      rotation: undefined,
      up: [0, 0, 1],
    });
  });
});
