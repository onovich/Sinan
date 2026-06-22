import { describe, expect, it } from 'vitest';

import levelJson from '../../../data/levels/level_01.json';
import avatarsJson from '../../../data/social/avatars.json';
import emotesJson from '../../../data/social/emotes.json';
import presetsJson from '../../../data/social/presets.json';
import stampsJson from '../../../data/social/stamps.json';
import { SocialRuntimeState } from '../../game/social';
import { SocialRemotePlayerSimulator } from '../../game/social/SocialRemotePlayerSimulator';
import { SocialWebSocketRoomPrototype } from '../../network/adapters/websocket/SocialWebSocketRoomPrototype';
import type { SocialNetworkMessage } from '../../network/socialMessages';
import { LevelSchema } from '../../schemas/level.schema';
import {
  SocialAvatarSchema,
  SocialEmoteSchema,
  SocialPresetSchema,
  SocialStampSchema,
} from '../../schemas/social.schema';
import type { RuntimeSocialDiagnostics } from '../RuntimeTypes';
import { ThreeRuntime } from './ThreeRuntime';

const avatars = avatarsJson.map((avatar) => SocialAvatarSchema.parse(avatar));
const emotes = emotesJson.map((emote) => SocialEmoteSchema.parse(emote));
const stamps = stampsJson.map((stamp) => SocialStampSchema.parse(stamp));
const preset = SocialPresetSchema.parse(presetsJson[0]);
const level = LevelSchema.parse(levelJson);

describe('social smoke perf low-end budget', () => {
  it('keeps ten remote avatar and stamp feedback budgets deterministic', () => {
    const runtime = new ThreeRuntime();
    const socialState = createSocialRuntimeState();

    driveSimulator(socialState, { lowEndProfile: false });
    runtime.setSocialState(toRuntimeSocialState(socialState.getSnapshot()));

    const diagnostics = runtime.getSocialDiagnostics();

    expect(diagnostics).toMatchObject({
      activeStampCount: 10,
      lowEndSuppressedRemoteCount: 0,
      lowEndSuppressedStampCount: 0,
      remoteCount: 10,
      roomStatus: 'full',
      visibleRemoteCount: 10,
      visibleStampCount: 10,
    });
    expect(estimateSocialDrawCalls(diagnostics)).toBeLessThanOrEqual(50);
    expect(estimateSocialTriangleBudget(diagnostics)).toBeLessThanOrEqual(1180);
  });

  it('keeps the low-end social profile inside local remote and stamp budgets', () => {
    const runtime = new ThreeRuntime();
    const socialState = createSocialRuntimeState();

    driveSimulator(socialState, { lowEndProfile: true });
    runtime.setSocialState(toRuntimeSocialState(socialState.getSnapshot()));
    runtime.setStyleQualityProfile('low-end');

    const diagnostics = runtime.getSocialDiagnostics();

    expect(diagnostics).toMatchObject({
      activeStampCount: 7,
      lowEndSuppressedRemoteCount: 0,
      lowEndSuppressedStampCount: 7,
      remoteCount: 7,
      roomStatus: 'open',
      visibleRemoteCount: 7,
      visibleStampCount: 0,
    });
    expect(estimateSocialDrawCalls(diagnostics)).toBeLessThanOrEqual(21);
    expect(estimateSocialTriangleBudget(diagnostics)).toBeLessThanOrEqual(462);
  });

  it('keeps room, rate-limit, and invalid-message diagnostics observable in the adapter', () => {
    const room = new SocialWebSocketRoomPrototype({
      avatars,
      emotes,
      limits: {
        maxRemotePlayers: 1,
        messagesPerPlayerPerSecond: 2,
      },
      roomId: 'room.showcase',
      stamps,
    });

    expect(room.connect(joinMessage('remote.sky.01'))).toMatchObject({ ok: true });
    expect(room.connect(joinMessage('remote.mint.02', 'avatar.courier_mint'))).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'room-full',
      },
    });
    expect(room.send(poseMessage(1, 1100))).toMatchObject({ ok: true });
    expect(room.send(poseMessage(2, 1150))).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'rate-limited',
      },
    });
    expect(
      room.send({
        schemaVersion: 1,
        messageId: 'ws.invalid.pose',
        sentAtMs: 1400,
        type: 'pose',
        playerId: 'remote.sky.01',
        pose: {
          position: [0, 0.1, 0],
          rotation: [0, 0, 0, 1],
          sequence: -1,
        },
      }),
    ).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'invalid-message',
      },
    });
    expect(room.getSnapshot()).toMatchObject({
      invalidMessageCount: 1,
      rateLimitedMessageCount: 1,
      room: {
        remotePlayerCount: 1,
        status: 'full',
      },
      roomFullCount: 1,
    });
  });
});

function createSocialRuntimeState(): SocialRuntimeState {
  return new SocialRuntimeState({
    avatars,
    emotes,
    limits: {
      maxRemotePlayers: preset.maxRemotePlayers,
      messagesPerPlayerPerSecond: 80,
    },
    stamps,
  });
}

function driveSimulator(
  socialState: SocialRuntimeState,
  options: { lowEndProfile: boolean },
): void {
  const simulator = new SocialRemotePlayerSimulator({
    avatars,
    emotes,
    lowEndProfile: options.lowEndProfile,
    preset,
    roomId: 'room.showcase',
    seed: 25,
    stamps,
    startAtMs: 1000,
    worldProjection: level.worldProjection,
  });

  for (const message of simulator.reset().messages) {
    socialState.apply(message);
  }

  for (let step = 0; step < 4; step += 1) {
    for (const message of simulator.step(250).messages) {
      socialState.apply(message);
    }
  }
}

function estimateSocialDrawCalls(diagnostics: RuntimeSocialDiagnostics): number {
  return diagnostics.visibleRemoteCount * 3 + diagnostics.visibleStampCount * 2;
}

function estimateSocialTriangleBudget(diagnostics: RuntimeSocialDiagnostics): number {
  return diagnostics.visibleRemoteCount * 66 + diagnostics.visibleStampCount * 52;
}

function joinMessage(playerId: string, avatarId = 'avatar.courier_sky'): SocialNetworkMessage {
  return {
    schemaVersion: 1,
    messageId: `ws.join.${playerId}`,
    sentAtMs: 1000,
    type: 'join',
    roomId: 'room.showcase',
    playerId,
    avatarId,
    displayName: playerId,
  };
}

function poseMessage(sequence: number, sentAtMs: number): SocialNetworkMessage {
  return {
    schemaVersion: 1,
    messageId: `ws.pose.${sequence}`,
    sentAtMs,
    type: 'pose',
    playerId: 'remote.sky.01',
    pose: {
      position: [0, 0.1, 0],
      rotation: [0, 0, 0, 1],
      sequence,
    },
  };
}

function toRuntimeSocialState(snapshot: ReturnType<SocialRuntimeState['getSnapshot']>) {
  return {
    activeStamps: snapshot.activeStamps,
    invalidMessageCount: snapshot.invalidMessageCount,
    players: snapshot.players,
    rateLimitedMessageCount: snapshot.rateLimitedMessageCount,
    room: snapshot.room,
    roomFullCount: snapshot.roomFullCount,
    sequence: snapshot.sequence,
    stalePlayerCount: snapshot.stalePlayerCount,
    staleSnapshotCount: snapshot.staleSnapshotCount,
  };
}
