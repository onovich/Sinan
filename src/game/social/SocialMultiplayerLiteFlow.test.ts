import { describe, expect, it } from 'vitest';

import levelJson from '../../../data/levels/level_01.json';
import avatarsJson from '../../../data/social/avatars.json';
import emotesJson from '../../../data/social/emotes.json';
import presetsJson from '../../../data/social/presets.json';
import stampsJson from '../../../data/social/stamps.json';
import { EngineSession } from '../../engine/EngineSession';
import { createDeliveryJobRuntimeFromLevel } from '../../game/delivery';
import { SocialWebSocketRoomPrototype } from '../../network/adapters/websocket/SocialWebSocketRoomPrototype';
import { LevelSchema } from '../../schemas/level.schema';
import {
  SocialAvatarSchema,
  SocialEmoteSchema,
  SocialPresetSchema,
  SocialStampSchema,
} from '../../schemas/social.schema';
import { ThreeRuntime } from '../../runtime/three/ThreeRuntime';
import { createSocialHudViewModel } from './SocialHudViewModel';
import { SocialRemotePlayerSimulator } from './SocialRemotePlayerSimulator';
import { SocialRuntimeState } from './SocialRuntimeState';

const avatars = avatarsJson.map((avatar) => SocialAvatarSchema.parse(avatar));
const emotes = emotesJson.map((emote) => SocialEmoteSchema.parse(emote));
const stamps = stampsJson.map((stamp) => SocialStampSchema.parse(stamp));
const preset = SocialPresetSchema.parse(presetsJson[0]);
const level = LevelSchema.parse(levelJson);

describe('social multiplayer-lite flow delivery showcase integration', () => {
  it('drives simulator state through EngineSession, Three diagnostics, and HUD', () => {
    const simulator = new SocialRemotePlayerSimulator({
      avatars,
      emotes,
      preset,
      roomId: 'room.showcase',
      seed: 25,
      stamps,
      startAtMs: 1000,
      worldProjection: level.worldProjection,
    });
    const socialRuntime = new SocialRuntimeState({
      avatars,
      emotes,
      limits: {
        maxRemotePlayers: 10,
        messagesPerPlayerPerSecond: 80,
      },
      stamps,
    });
    const threeRuntime = new ThreeRuntime();
    const session = new EngineSession({ runtime: threeRuntime });

    for (const message of simulator.reset().messages) {
      expect(socialRuntime.apply(message).ok).toBe(true);
    }

    for (let step = 0; step < 4; step += 1) {
      for (const message of simulator.step(250).messages) {
        socialRuntime.apply(message);
      }
    }

    const snapshot = socialRuntime.getSnapshot();
    session.setSocialRuntimeSnapshot(snapshot);

    expect(snapshot.activeStamps.some((stamp) => stamp.stampId === 'stamp.wave_ring')).toBe(true);
    expect(snapshot.room).toMatchObject({
      remotePlayerCount: 10,
      status: 'full',
    });
    expect(threeRuntime.getSocialDiagnostics()).toMatchObject({
      activeStampCount: snapshot.activeStamps.length,
      remoteCount: 10,
      roomStatus: 'full',
      visibleRemoteCount: 10,
      visibleStampCount: snapshot.activeStamps.length,
    });
    expect(createSocialHudViewModel({ snapshot })).toMatchObject({
      activeStampCount: snapshot.activeStamps.length,
      prompt: `${snapshot.activeStamps.length} active social stamp`,
      remoteCount: 10,
      roomStatus: 'full',
      statusLabel: 'Room full',
    });
  });

  it('round-trips WebSocket prototype messages into a client snapshot', () => {
    const room = new SocialWebSocketRoomPrototype({
      avatars,
      emotes,
      limits: {
        maxRemotePlayers: 10,
        messagesPerPlayerPerSecond: 20,
      },
      roomId: 'room.showcase',
      stamps,
    });
    const clientRuntime = new SocialRuntimeState({
      avatars,
      emotes,
      limits: {
        maxRemotePlayers: 10,
        messagesPerPlayerPerSecond: 20,
      },
      stamps,
    });

    expect(room.connect(joinMessage('remote.sky.01'))).toMatchObject({ ok: true });
    expect(room.send(poseMessage(1))).toMatchObject({ ok: true });
    expect(room.send(emoteMessage())).toMatchObject({ ok: true });
    expect(room.send(stampMessage())).toMatchObject({
      ok: true,
      snapshot: {
        activeStamps: [expect.objectContaining({ stampId: 'stamp.wave_ring' })],
      },
    });

    const snapshotMessage = room.createSnapshotMessage(1400);
    expect(snapshotMessage).toMatchObject({
      type: 'snapshot',
      players: [expect.objectContaining({ playerId: 'remote.sky.01' })],
    });
    expect(clientRuntime.apply(snapshotMessage)).toMatchObject({
      ok: true,
      snapshot: {
        activeStamps: [expect.objectContaining({ stampId: 'stamp.wave_ring' })],
        room: {
          remotePlayerCount: 1,
        },
      },
    });
    expect(room.disconnect('remote.sky.01', 1500)).toMatchObject({
      ok: true,
      snapshot: {
        players: [expect.objectContaining({ status: 'disconnected' })],
      },
    });
  });

  it('rejects invalid social messages without corrupting delivery showcase state', () => {
    const deliveryRuntime = createDeliveryJobRuntimeFromLevel(level);
    const socialRuntime = new SocialRuntimeState({ avatars, emotes, stamps });

    expect(deliveryRuntime.accept('job.hill_mail_run', 'delivery.courier_hill')).toMatchObject({
      ok: true,
    });
    expect(deliveryRuntime.progress('job.hill_mail_run')).toMatchObject({ ok: true });
    const deliveryBeforeInvalidSocial = deliveryRuntime.getSnapshot();

    expect(
      socialRuntime.apply({
        schemaVersion: 1,
        messageId: 'invalid.social.pose',
        sentAtMs: 1200,
        type: 'pose',
        playerId: 'remote.missing',
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
    expect(deliveryRuntime.getSnapshot()).toEqual(deliveryBeforeInvalidSocial);
    expect(
      deliveryRuntime.readyToDeliver('job.hill_mail_run', 'delivery.mailbox_hill'),
    ).toMatchObject({
      ok: true,
    });
    expect(deliveryRuntime.complete('job.hill_mail_run', 'delivery.mailbox_hill')).toMatchObject({
      ok: true,
      job: {
        status: 'completed',
      },
    });
  });
});

function joinMessage(playerId: string) {
  return {
    schemaVersion: 1 as const,
    messageId: `ws.join.${playerId}`,
    sentAtMs: 1000,
    type: 'join' as const,
    roomId: 'room.showcase',
    playerId,
    avatarId: 'avatar.courier_sky',
    displayName: 'Sky Remote',
  };
}

function poseMessage(sequence: number) {
  return {
    schemaVersion: 1 as const,
    messageId: `ws.pose.${sequence}`,
    sentAtMs: 1100,
    type: 'pose' as const,
    playerId: 'remote.sky.01',
    pose: {
      position: [0, 0.1, 0] as [number, number, number],
      rotation: [0, 0, 0, 1] as [number, number, number, number],
      sequence,
    },
  };
}

function emoteMessage() {
  return {
    schemaVersion: 1 as const,
    messageId: 'ws.emote.1',
    sentAtMs: 1200,
    type: 'emote' as const,
    playerId: 'remote.sky.01',
    emoteId: 'emote.wave',
  };
}

function stampMessage() {
  return {
    schemaVersion: 1 as const,
    messageId: 'ws.stamp.1',
    sentAtMs: 1300,
    type: 'stamp' as const,
    playerId: 'remote.sky.01',
    stampId: 'stamp.wave_ring',
    pose: {
      position: [0, 0.1, 0] as [number, number, number],
      rotation: [0, 0, 0, 1] as [number, number, number, number],
      sequence: 2,
    },
  };
}
