import { describe, expect, it } from 'vitest';

import {
  SocialAvatarSchema,
  SocialEmoteSchema,
  SocialPresetSchema,
  SocialStampSchema,
} from './social.schema';

describe('social avatar emote stamp schemas', () => {
  it('parses renderer-neutral avatar, emote, stamp, and preset contracts', () => {
    expect(
      SocialAvatarSchema.safeParse({
        schemaVersion: 1,
        id: 'avatar.courier_sky',
        displayName: 'Sky Courier',
        shortLabel: 'SKY',
        bodyColor: '#4BA3FF',
        accentColor: '#F8D66D',
        modelAssetId: 'model.player_spawn',
        fixtureScale: 1,
        lowEndBehavior: 'badge-only',
      }).success,
    ).toBe(true);

    expect(
      SocialEmoteSchema.safeParse({
        schemaVersion: 1,
        id: 'emote.wave',
        label: 'Wave',
        iconToken: 'wave',
        durationMs: 1600,
        cooldownMs: 1200,
        color: '#4BA3FF',
        fallbackLabel: 'Hi',
      }).success,
    ).toBe(true);

    expect(
      SocialStampSchema.safeParse({
        schemaVersion: 1,
        id: 'stamp.wave_ring',
        emoteId: 'emote.wave',
        label: 'Wave Ring',
        lifetimeMs: 2200,
        radius: 0.9,
        height: 1.35,
        color: '#4BA3FF',
        priority: 2,
        lowEndBehavior: 'visible',
      }).success,
    ).toBe(true);

    expect(
      SocialPresetSchema.safeParse({
        schemaVersion: 1,
        id: 'social.showcase',
        label: 'Showcase',
        maxRemotePlayers: 1,
        remotes: [
          {
            id: 'remote.01',
            avatarId: 'avatar.courier_sky',
            displayName: 'Remote 01',
            initialEmoteId: 'emote.wave',
            initialStampId: 'stamp.wave_ring',
            spawnRegion: 'hill',
            lowEndVisible: true,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects renderer, transport, invalid color, lifetime, and low-end fields', () => {
    expect(
      SocialAvatarSchema.safeParse({
        schemaVersion: 1,
        id: 'avatar.bad',
        displayName: 'Bad',
        shortLabel: 'BAD',
        bodyColor: 'blue',
        accentColor: '#fff',
        socketId: 'socket-1',
        lowEndBehavior: 'sprite-only',
      }).success,
    ).toBe(false);

    expect(
      SocialEmoteSchema.safeParse({
        schemaVersion: 1,
        id: 'emote.bad',
        label: 'Bad',
        iconToken: 'wave',
        durationMs: 100,
        cooldownMs: 1200,
        color: '#4BA3FF',
        fallbackLabel: 'Bad',
      }).success,
    ).toBe(false);

    expect(
      SocialStampSchema.safeParse({
        schemaVersion: 1,
        id: 'stamp.bad',
        emoteId: 'emote.wave',
        label: 'Bad',
        lifetimeMs: 2200,
        radius: 0.9,
        height: 1.35,
        color: '#4BA3FF',
        priority: 2,
        object3D: 'three-object',
      }).success,
    ).toBe(false);
  });
});
