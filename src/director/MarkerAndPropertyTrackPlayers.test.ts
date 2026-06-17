import { describe, expect, it } from 'vitest';

import type { DirectorCommand } from '../events/types';
import { AudioTrackPlayer, type SoundTimelineTrackData } from './AudioTrackPlayer';
import { PropertyTrackPlayer, type PropertyTimelineTrackData } from './PropertyTrackPlayer';
import { SubtitleTrackPlayer, type SubtitleTimelineTrackData } from './SubtitleTrackPlayer';

describe('PropertyTrackPlayer', () => {
  it('samples numeric properties continuously', () => {
    const track: PropertyTimelineTrackData = {
      id: 'track_gate_open_amount',
      type: 'property',
      target: 'gate_a',
      property: 'Door.openAmount',
      keys: [
        { time: 0, value: 0 },
        { time: 2, value: 1 },
      ],
    };

    expect(new PropertyTrackPlayer().sample(track, 1)).toEqual({
      target: 'gate_a',
      property: 'Door.openAmount',
      value: 0.5,
    });
  });

  it('samples vec3 properties continuously', () => {
    const track: PropertyTimelineTrackData = {
      id: 'track_gate_hint_position',
      type: 'property',
      target: 'gate_hint',
      property: 'Transform.position',
      keys: [
        { time: 0, value: [0, 1, 2] },
        { time: 2, value: [2, 3, 4] },
      ],
    };

    expect(new PropertyTrackPlayer().sample(track, 1).value).toEqual([1, 2, 3]);
  });
});

describe('SubtitleTrackPlayer', () => {
  it('queues subtitle commands for playback and active scrub range', () => {
    const directorCommands: DirectorCommand[] = [];
    const track: SubtitleTimelineTrackData = {
      id: 'track_subtitle_gate_open',
      type: 'subtitle',
      time: 1,
      text: 'Gate open.',
      duration: 2,
    };
    const player = new SubtitleTrackPlayer();

    player.play(track, { directorCommands });
    const scrubbed = player.scrub(track, { directorCommands }, 1.5);
    const skipped = player.scrub(track, { directorCommands }, 4);

    expect(scrubbed).toBe(true);
    expect(skipped).toBe(false);
    expect(directorCommands).toEqual([
      { type: 'subtitle.show', text: 'Gate open.', duration: 2 },
      { type: 'subtitle.show', text: 'Gate open.', duration: 2 },
    ]);
  });
});

describe('AudioTrackPlayer', () => {
  it('queues sound commands for playback and skips scrub', () => {
    const directorCommands: DirectorCommand[] = [];
    const track: SoundTimelineTrackData = {
      id: 'track_sound_switch',
      type: 'sound',
      time: 0.2,
      soundId: 'audio.switch_click',
    };
    const player = new AudioTrackPlayer();

    player.play(track, { directorCommands });
    const scrubbed = player.scrub();

    expect(scrubbed).toBe(false);
    expect(directorCommands).toEqual([{ type: 'sound.play', soundId: 'audio.switch_click' }]);
  });
});
