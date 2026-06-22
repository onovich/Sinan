import { describe, expect, it } from 'vitest';

import { CameraShotSchema } from './cameraShot.schema';

describe('CameraShotSchema', () => {
  it('parses static and keyframed camera shots', () => {
    const staticShot = CameraShotSchema.parse({
      schemaVersion: 1,
      id: 'cam_static',
      type: 'static',
      pose: {
        position: [1, 2, 3],
        lookAt: 'gate_a',
        fov: 55,
      },
    });
    const keyframedShot = CameraShotSchema.parse({
      schemaVersion: 1,
      id: 'cam_gate_reveal',
      type: 'keyframed',
      duration: 3.5,
      keys: [
        { time: 0, position: [2, 1.6, 5], lookAt: [4, 1.2, 8], fov: 55 },
        {
          time: 3.5,
          position: [5, 2.2, 9],
          lookAt: 'gate_a',
          fov: 38,
          ease: 'easeOutCubic',
        },
      ],
    });

    expect(staticShot.id).toBe('cam_static');
    expect(keyframedShot.id).toBe('cam_gate_reveal');
  });

  it('parses spherical camera points while keeping entity lookAt targets valid', () => {
    const shot = CameraShotSchema.parse({
      schemaVersion: 1,
      id: 'cam_spherical_region',
      type: 'keyframed',
      duration: 2,
      keys: [
        {
          time: 0,
          position: {
            mode: 'spherical-region',
            region: 'city',
            localPosition: [0, 0, 0],
          },
          lookAt: 'gate_a',
          fov: 50,
        },
        {
          time: 2,
          position: [2, 3, 4],
          lookAt: {
            mode: 'spherical-region',
            region: 'beach',
            localPosition: [0, 0, 0],
          },
          fov: 45,
        },
      ],
    });

    expect(shot.type).toBe('keyframed');
    if (shot.type !== 'keyframed') {
      throw new Error('Expected keyframed camera shot.');
    }
    expect(shot.keys[0].position).toMatchObject({
      mode: 'spherical-region',
      region: 'city',
    });
  });

  it('rejects empty keyframed shots', () => {
    expect(() =>
      CameraShotSchema.parse({
        schemaVersion: 1,
        id: 'cam_bad',
        type: 'keyframed',
        duration: 3,
        keys: [],
      }),
    ).toThrow();
  });
});
