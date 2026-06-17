import { describe, expect, it } from 'vitest';

import { TimelineSchema } from './timeline.schema';

describe('TimelineSchema', () => {
  it('parses MVP timeline tracks', () => {
    const parsed = TimelineSchema.parse({
      schemaVersion: 1,
      id: 'tl_open_gate',
      name: 'Open Gate Timeline',
      duration: 4.5,
      settings: {
        skippable: true,
        lockPlayerControl: true,
        restoreCameraOnFinish: true,
      },
      tracks: [
        {
          id: 'track_camera_gate_reveal',
          type: 'camera.shot',
          start: 0,
          duration: 3.5,
          shotId: 'cam_gate_reveal',
          blendIn: 0.25,
          blendOut: 0.4,
        },
        {
          id: 'track_gate_open_anim',
          type: 'animation.play',
          start: 0.4,
          entityId: 'gate_a',
          clip: 'Open',
          loop: false,
          fadeIn: 0.1,
        },
        {
          id: 'track_sound_switch',
          type: 'sound',
          time: 0.2,
          soundId: 'audio.switch_click',
        },
        {
          id: 'track_subtitle',
          type: 'subtitle',
          time: 1.1,
          text: 'The gate is open.',
          duration: 2,
        },
        {
          id: 'track_set_flag',
          type: 'action',
          time: 3.8,
          action: {
            type: 'flag.set',
            flag: 'gate_a_opened',
            value: true,
          },
        },
        {
          id: 'track_light_gate',
          type: 'property',
          target: 'gate_light',
          property: 'Light.intensity',
          keys: [
            { time: 0, value: 0.2, ease: 'linear' },
            { time: 2, value: 3 },
          ],
        },
        {
          id: 'track_hold',
          type: 'wait',
          start: 3.5,
          duration: 0.5,
        },
      ],
    });

    expect(parsed.id).toBe('tl_open_gate');
    expect(parsed.tracks.some((track) => track.id === 'track_set_flag')).toBe(true);
  });

  it('rejects negative track time', () => {
    expect(() =>
      TimelineSchema.parse({
        schemaVersion: 1,
        id: 'tl_bad',
        duration: 1,
        tracks: [
          {
            id: 'track_bad',
            type: 'action',
            time: -0.1,
            action: {
              type: 'flag.set',
              flag: 'bad',
              value: true,
            },
          },
        ],
      }),
    ).toThrow();
  });
});
