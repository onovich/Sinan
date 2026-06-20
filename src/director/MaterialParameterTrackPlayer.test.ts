import { describe, expect, it } from 'vitest';

import {
  MaterialParameterTrackPlayer,
  type MaterialParameterTimelineTrackData,
} from './MaterialParameterTrackPlayer';

describe('MaterialParameterTrackPlayer', () => {
  it('samples numeric material parameters continuously', () => {
    const track: MaterialParameterTimelineTrackData = {
      id: 'track_gate_dissolve_progress',
      type: 'material.parameter',
      target: 'gate_a',
      slot: 'main',
      parameter: 'progress',
      keys: [
        { time: 0, value: 0 },
        { time: 2, value: 1 },
      ],
    };

    expect(new MaterialParameterTrackPlayer().sample(track, 1)).toEqual({
      target: 'gate_a',
      slot: 'main',
      parameter: 'progress',
      value: 0.5,
    });
  });

  it('clamps to first and last keys', () => {
    const track: MaterialParameterTimelineTrackData = {
      id: 'track_edge_width',
      type: 'material.parameter',
      target: 'gate_a',
      slot: 'main',
      parameter: 'edgeWidth',
      keys: [
        { time: 1, value: 0.05 },
        { time: 2, value: 0.2 },
      ],
    };
    const player = new MaterialParameterTrackPlayer();

    expect(player.sample(track, 0).value).toBe(0.05);
    expect(player.sample(track, 4).value).toBe(0.2);
  });

  it('sorts unsorted keys and lets duplicate times resolve to the last key', () => {
    const track: MaterialParameterTimelineTrackData = {
      id: 'track_duplicate_progress',
      type: 'material.parameter',
      target: 'gate_a',
      slot: 'main',
      parameter: 'progress',
      keys: [
        { time: 2, value: 1 },
        { time: 0, value: 0 },
        { time: 1, value: 0.2 },
        { time: 1, value: 0.4 },
      ],
    };
    const player = new MaterialParameterTrackPlayer();

    expect(player.sample(track, 1).value).toBe(0.4);
    expect(player.sample(track, 1.5).value).toBe(0.7);
  });

  it('interpolates color and vector values', () => {
    const player = new MaterialParameterTrackPlayer();
    const colorTrack: MaterialParameterTimelineTrackData = {
      id: 'track_edge_color',
      type: 'material.parameter',
      target: 'gate_a',
      slot: 'main',
      parameter: 'edgeColor',
      keys: [
        { time: 0, value: '#000000' },
        { time: 2, value: '#ffffff' },
      ],
    };
    const vec2Track: MaterialParameterTimelineTrackData = {
      ...colorTrack,
      id: 'track_uv_scale',
      parameter: 'uvScale',
      keys: [
        { time: 0, value: [0, 2] },
        { time: 2, value: [2, 4] },
      ],
    };
    const vec3Track: MaterialParameterTimelineTrackData = {
      ...colorTrack,
      id: 'track_direction',
      parameter: 'direction',
      keys: [
        { time: 0, value: [0, 1, 2] },
        { time: 2, value: [2, 3, 4] },
      ],
    };

    expect(player.sample(colorTrack, 1).value).toBe('#808080');
    expect(player.sample(vec2Track, 1).value).toEqual([1, 3]);
    expect(player.sample(vec3Track, 1).value).toEqual([1, 2, 3]);
  });

  it('keeps booleans, strings, and incompatible values discrete', () => {
    const player = new MaterialParameterTrackPlayer();
    const booleanTrack: MaterialParameterTimelineTrackData = {
      id: 'track_enabled',
      type: 'material.parameter',
      target: 'gate_a',
      slot: 'main',
      parameter: 'enabled',
      keys: [
        { time: 0, value: false },
        { time: 2, value: true },
      ],
    };
    const stringTrack: MaterialParameterTimelineTrackData = {
      ...booleanTrack,
      id: 'track_texture',
      parameter: 'noiseMap',
      keys: [
        { time: 0, value: 'texture.a' },
        { time: 2, value: 'texture.b' },
      ],
    };
    const incompatibleTrack: MaterialParameterTimelineTrackData = {
      ...booleanTrack,
      id: 'track_mixed',
      parameter: 'progress',
      keys: [
        { time: 0, value: 0 },
        { time: 2, value: '#ffffff' },
      ],
    };

    expect(player.sample(booleanTrack, 1).value).toBe(false);
    expect(player.sample(booleanTrack, 2).value).toBe(true);
    expect(player.sample(stringTrack, 1).value).toBe('texture.a');
    expect(player.sample(incompatibleTrack, 1).value).toBe(0);
  });
});
