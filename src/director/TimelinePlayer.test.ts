import { describe, expect, it } from 'vitest';

import { TimelinePlayer, sortTimelineTracks } from './TimelinePlayer';
import type { TimelineData } from '../schemas/timeline.schema';

const timeline: TimelineData = {
  schemaVersion: 1,
  id: 'tl_open_gate',
  duration: 4,
  tracks: [
    {
      id: 'track_late',
      type: 'action',
      time: 2,
      action: {
        type: 'flag.set',
        flag: 'gate_a_opened',
        value: true,
      },
    },
    {
      id: 'track_start',
      type: 'sound',
      time: 0,
      soundId: 'audio.switch_click',
    },
    {
      id: 'track_anim',
      type: 'animation.play',
      start: 0.5,
      entityId: 'gate_a',
      clip: 'Open',
    },
    {
      id: 'track_material_progress',
      type: 'material.parameter',
      target: 'gate_a',
      slot: 'main',
      parameter: 'progress',
      keys: [
        { time: 0.25, value: 0 },
        { time: 2, value: 1 },
      ],
    },
  ],
};

describe('TimelinePlayer', () => {
  it('sorts tracks by start time and id', () => {
    expect(sortTimelineTracks(timeline.tracks).map((track) => track.id)).toEqual([
      'track_start',
      'track_material_progress',
      'track_anim',
      'track_late',
    ]);
  });

  it('plays and advances the cursor through reached tracks', () => {
    const reached: string[] = [];
    const finished: string[] = [];
    const player = new TimelinePlayer(
      { [timeline.id]: timeline },
      {
        onTrackReached: ({ track }) => reached.push(track.id),
        onTimelineFinished: ({ timeline: finishedTimeline }) => finished.push(finishedTimeline.id),
      },
    );

    player.play('tl_open_gate');
    player.update(0.75);
    player.update(3.5);

    expect(reached).toEqual(['track_start', 'track_material_progress', 'track_anim', 'track_late']);
    expect(player.getState('tl_open_gate')).toMatchObject({
      status: 'stopped',
      time: 4,
      cursor: 4,
    });
    expect(finished).toEqual(['tl_open_gate']);
  });

  it('pauses and resumes without advancing time while paused', () => {
    const player = new TimelinePlayer({ [timeline.id]: timeline });

    player.play('tl_open_gate');
    player.update(1);
    player.pause('tl_open_gate');
    player.update(1);

    expect(player.getState('tl_open_gate')).toMatchObject({
      status: 'paused',
      time: 1,
    });

    player.resume('tl_open_gate');
    player.update(0.5);

    expect(player.getState('tl_open_gate')).toMatchObject({
      status: 'playing',
      time: 1.5,
    });
  });

  it('seeks by resetting the cursor to the requested time', () => {
    const reached: string[] = [];
    const player = new TimelinePlayer(
      { [timeline.id]: timeline },
      {
        onTrackReached: ({ track }) => reached.push(track.id),
      },
    );

    player.play('tl_open_gate');
    player.seek('tl_open_gate', 0.5);
    player.update(1.6);

    expect(reached).toEqual(['track_anim', 'track_late']);
    expect(player.getState('tl_open_gate')).toMatchObject({
      time: 2.1,
      cursor: 4,
    });
  });

  it('scrubs without playing or reaching tracks', () => {
    const reached: string[] = [];
    const scrubbed: number[] = [];
    const player = new TimelinePlayer(
      { [timeline.id]: timeline },
      {
        onTrackReached: ({ track }) => reached.push(track.id),
        onScrub: ({ time }) => scrubbed.push(time),
      },
    );

    player.scrub('tl_open_gate', 2.5);
    player.update(1);

    expect(reached).toEqual([]);
    expect(scrubbed).toEqual([2.5]);
    expect(player.isPlaying('tl_open_gate')).toBe(false);
    expect(player.getState('tl_open_gate')).toMatchObject({
      status: 'stopped',
      time: 2.5,
    });
  });
});
