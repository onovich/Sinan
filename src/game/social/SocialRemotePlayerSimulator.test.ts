import { describe, expect, it } from 'vitest';

import levelJson from '../../../data/levels/level_01.json';
import avatarsJson from '../../../data/social/avatars.json';
import emotesJson from '../../../data/social/emotes.json';
import presetsJson from '../../../data/social/presets.json';
import stampsJson from '../../../data/social/stamps.json';
import { LevelSchema } from '../../schemas/level.schema';
import {
  SocialAvatarSchema,
  SocialEmoteSchema,
  SocialPresetSchema,
  SocialStampSchema,
  type SocialPresetData,
} from '../../schemas/social.schema';
import { SocialRuntimeState } from './SocialRuntimeState';
import {
  SocialRemotePlayerSimulator,
  validateSocialSimulatorFixture,
} from './SocialRemotePlayerSimulator';

const avatars = avatarsJson.map((avatar) => SocialAvatarSchema.parse(avatar));
const emotes = emotesJson.map((emote) => SocialEmoteSchema.parse(emote));
const stamps = stampsJson.map((stamp) => SocialStampSchema.parse(stamp));
const preset = SocialPresetSchema.parse(presetsJson[0]);
const level = LevelSchema.parse(levelJson);

describe('social remote player simulator', () => {
  it('replays deterministic join and pose messages for ten remotes', () => {
    const left = createSimulator();
    const right = createSimulator();

    expect(left.reset().messages).toEqual(right.reset().messages);
    expect(left.getRemoteCount()).toBe(10);

    const leftStep = left.step(250);
    const rightStep = right.step(250);

    expect(leftStep).toEqual(rightStep);
    expect(leftStep.messages.filter((message) => message.type === 'pose')).toHaveLength(10);
    expect(leftStep.messages[0]).toMatchObject({
      type: 'pose',
      playerId: 'remote.sky.01',
      pose: {
        region: 'hill',
        sequence: 1,
      },
    });
    expect(
      leftStep.messages[0]?.type === 'pose' ? leftStep.messages[0].pose.rotation : [],
    ).not.toEqual([0, 0, 0, 1]);
  });

  it('drives runtime state without network transport', () => {
    const simulator = createSimulator();
    const runtime = new SocialRuntimeState({
      avatars,
      emotes,
      limits: {
        maxRemotePlayers: 10,
        messagesPerPlayerPerSecond: 60,
      },
      stamps,
    });

    for (const message of simulator.reset().messages) {
      expect(runtime.apply(message).ok).toBe(true);
    }

    simulator.step(250).messages.forEach((message) => runtime.apply(message));
    simulator.step(250).messages.forEach((message) => runtime.apply(message));
    simulator.step(250).messages.forEach((message) => runtime.apply(message));
    simulator.step(250).messages.forEach((message) => runtime.apply(message));

    const snapshot = runtime.getSnapshot();
    const skyPlayer = snapshot.players.find((player) => player.playerId === 'remote.sky.01');

    expect(snapshot.activeStamps.some((stamp) => stamp.stampId === 'stamp.wave_ring')).toBe(true);
    expect(skyPlayer?.pose?.sequence).toBe(4);
    expect(snapshot.room.remotePlayerCount).toBe(10);
    expect(snapshot.room.status).toBe('full');
  });

  it('supports a deterministic low-end remote budget', () => {
    const simulator = createSimulator({ lowEndProfile: true });

    expect(simulator.getRemoteCount()).toBe(7);
    expect(simulator.reset().messages.map((message) => message.type)).toEqual(
      Array.from({ length: 7 }, () => 'join'),
    );
  });

  it('reports invalid simulator fixtures before emitting messages', () => {
    const invalidPreset: SocialPresetData = {
      ...preset,
      maxRemotePlayers: 1,
      remotes: [
        ...preset.remotes,
        {
          id: 'remote.bad',
          avatarId: 'avatar.missing',
          displayName: 'Bad Remote',
          initialEmoteId: 'emote.missing',
          initialStampId: 'stamp.missing',
          spawnRegion: 'missing-region',
          lowEndVisible: true,
        },
      ],
    };
    const options = {
      avatars,
      emotes,
      preset: invalidPreset,
      stamps,
      worldProjection: level.worldProjection,
    };
    const simulator = new SocialRemotePlayerSimulator(options);

    expect(validateSocialSimulatorFixture(options)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-fixture',
          path: 'data/social/presets.json.social.showcase.ten_remote.remotes',
        }),
        expect.objectContaining({
          code: 'invalid-fixture',
          message: 'Missing social avatar "avatar.missing".',
        }),
        expect.objectContaining({
          code: 'invalid-fixture',
          message: 'Missing social emote "emote.missing".',
        }),
        expect.objectContaining({
          code: 'invalid-fixture',
          message: 'Missing social stamp "stamp.missing".',
        }),
        expect.objectContaining({
          code: 'missing-region',
          message: 'Missing spherical spawn region "missing-region".',
        }),
      ]),
    );
    expect(simulator.reset().messages).toEqual([]);
  });
});

function createSimulator(
  overrides: Partial<ConstructorParameters<typeof SocialRemotePlayerSimulator>[0]> = {},
) {
  return new SocialRemotePlayerSimulator({
    avatars,
    emotes,
    preset,
    roomId: 'room.showcase',
    seed: 7,
    stamps,
    startAtMs: 1000,
    worldProjection: level.worldProjection,
    ...overrides,
  });
}
