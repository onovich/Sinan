import { describe, expect, it } from 'vitest';

import type { DirectorCommand } from '../events/types';
import { CameraShotTrackPlayer, type CameraShotTimelineTrackData } from './CameraShotTrackPlayer';

const cameraTrack: CameraShotTimelineTrackData = {
  id: 'track_camera_gate_reveal',
  type: 'camera.shot',
  start: 0.25,
  duration: 3.5,
  shotId: 'cam_gate_reveal',
  blendIn: 0.25,
  blendOut: 0.4,
};

describe('CameraShotTrackPlayer', () => {
  it('queues a director camera play command', () => {
    const directorCommands: DirectorCommand[] = [];

    new CameraShotTrackPlayer().play(cameraTrack, { directorCommands });

    expect(directorCommands).toEqual([
      {
        type: 'camera.shot.play',
        shotId: 'cam_gate_reveal',
        duration: 3.5,
        blendIn: 0.25,
        blendOut: 0.4,
      },
    ]);
  });

  it('queues clamped camera sample commands for scrub', () => {
    const directorCommands: DirectorCommand[] = [];
    const player = new CameraShotTrackPlayer();

    player.scrub(cameraTrack, { directorCommands }, 0);
    player.scrub(cameraTrack, { directorCommands }, 1.25);
    player.scrub(cameraTrack, { directorCommands }, 6);

    expect(directorCommands).toEqual([
      { type: 'camera.shot.sample', shotId: 'cam_gate_reveal', time: 0 },
      { type: 'camera.shot.sample', shotId: 'cam_gate_reveal', time: 1 },
      { type: 'camera.shot.sample', shotId: 'cam_gate_reveal', time: 3.5 },
    ]);
  });
});
