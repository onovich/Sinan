import { describe, expect, it } from 'vitest';

import type { AssetManifestData } from '../schemas/asset.schema';
import type {
  SocialAvatarData,
  SocialEmoteData,
  SocialPresetData,
  SocialStampData,
} from '../schemas/social.schema';
import { validateProject } from './validateProject';

const assets: AssetManifestData = {
  schemaVersion: 1,
  assets: {
    'model.player_spawn': {
      type: 'model',
      url: '/models/markers/player_spawn.glb',
      metadata: {
        category: 'marker',
        materialProfile: 'palette-toon',
        maxTriangles: 64,
        textureBudgetKb: 0,
        sizeBudgetBytes: 4096,
        compressed: false,
        compression: {
          codec: 'none',
          status: 'source',
        },
      },
    },
    'audio.switch_click': {
      type: 'audio',
      url: '/audio/switch_click.wav',
      metadata: {
        category: 'audio',
        sizeBudgetBytes: 4096,
      },
    },
  },
};

const socialAvatars: SocialAvatarData[] = [
  {
    schemaVersion: 1,
    id: 'avatar.courier_sky',
    displayName: 'Sky Courier',
    shortLabel: 'SKY',
    bodyColor: '#4BA3FF',
    accentColor: '#F8D66D',
    modelAssetId: 'model.player_spawn',
    fixtureScale: 1,
    lowEndBehavior: 'visible',
  },
];

const socialEmotes: SocialEmoteData[] = [
  {
    schemaVersion: 1,
    id: 'emote.wave',
    label: 'Wave',
    iconToken: 'wave',
    durationMs: 1600,
    cooldownMs: 1200,
    color: '#4BA3FF',
    fallbackLabel: 'Hi',
  },
];

const socialStamps: SocialStampData[] = [
  {
    schemaVersion: 1,
    id: 'stamp.wave_ring',
    emoteId: 'emote.wave',
    label: 'Wave Ring',
    lifetimeMs: 2200,
    radius: 0.9,
    height: 1.35,
    color: '#4BA3FF',
    priority: 2,
    lowEndBehavior: 'badge-only',
  },
];

const socialPresets: SocialPresetData[] = [
  {
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
  },
];

describe('social validate-data references', () => {
  it('accepts valid social catalog data', () => {
    expect(
      validateProject({
        assets,
        prefabs: [],
        levels: [],
        socialAvatars,
        socialEmotes,
        socialStamps,
        socialPresets,
      }).issues,
    ).toEqual([]);
  });

  it('reports duplicate and stale social references', () => {
    const issues = validateProject({
      assets,
      prefabs: [],
      levels: [],
      socialAvatars: [
        ...socialAvatars,
        {
          ...socialAvatars[0],
          modelAssetId: 'audio.switch_click',
        },
        {
          ...socialAvatars[0],
          id: 'avatar.missing_asset',
          modelAssetId: 'model.missing',
        },
      ],
      socialEmotes,
      socialStamps: [
        ...socialStamps,
        {
          ...socialStamps[0],
          id: 'stamp.bad_emote',
          emoteId: 'emote.missing',
        },
      ],
      socialPresets: [
        {
          ...socialPresets[0],
          maxRemotePlayers: 1,
          remotes: [
            ...socialPresets[0].remotes,
            {
              id: 'remote.01',
              avatarId: 'avatar.missing',
              displayName: 'Remote Duplicate',
              initialEmoteId: 'emote.missing',
              initialStampId: 'stamp.missing',
              lowEndVisible: true,
            },
          ],
        },
      ],
    }).issues;

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'data/social/avatars.json',
          message: 'Duplicate social avatar id "avatar.courier_sky".',
        }),
        expect.objectContaining({
          path: 'data/social/avatars.json.avatar.courier_sky.modelAssetId',
          message: 'Asset "audio.switch_click" must be type "model", got "audio".',
        }),
        expect.objectContaining({
          path: 'data/social/avatars.json.avatar.missing_asset.modelAssetId',
          message: 'Missing asset "model.missing".',
        }),
        expect.objectContaining({
          path: 'data/social/stamps.json.stamp.bad_emote.emoteId',
          message: 'Missing social emote "emote.missing".',
        }),
        expect.objectContaining({
          path: 'data/social/presets.json.social.showcase.remotes',
          message: 'Duplicate social preset remote id "remote.01".',
        }),
        expect.objectContaining({
          path: 'data/social/presets.json.social.showcase.remotes',
          message: 'Social preset "social.showcase" has 2 remotes but maxRemotePlayers is 1.',
        }),
        expect.objectContaining({
          path: 'data/social/presets.json.social.showcase.remotes.remote.01.avatarId',
          message: 'Missing social avatar "avatar.missing".',
        }),
        expect.objectContaining({
          path: 'data/social/presets.json.social.showcase.remotes.remote.01.initialEmoteId',
          message: 'Missing social emote "emote.missing".',
        }),
        expect.objectContaining({
          path: 'data/social/presets.json.social.showcase.remotes.remote.01.initialStampId',
          message: 'Missing social stamp "stamp.missing".',
        }),
      ]),
    );
  });
});
