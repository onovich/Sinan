import { describe, expect, it } from 'vitest';

import avatarsJson from '../../../../data/social/avatars.json';
import emotesJson from '../../../../data/social/emotes.json';
import stampsJson from '../../../../data/social/stamps.json';
import {
  SocialAvatarSchema,
  SocialEmoteSchema,
  SocialStampSchema,
} from '../../../schemas/social.schema';
import { SocialWebSocketRoomPrototype } from './SocialWebSocketRoomPrototype';

const avatars = avatarsJson.map((avatar) => SocialAvatarSchema.parse(avatar));
const emotes = emotesJson.map((emote) => SocialEmoteSchema.parse(emote));
const stamps = stampsJson.map((stamp) => SocialStampSchema.parse(stamp));

const pose = {
  position: [0, 0.1, 0] as [number, number, number],
  rotation: [0, 0, 0, 1] as [number, number, number, number],
  sequence: 1,
};

describe('websocket room social adapter prototype', () => {
  it('handles join, pose, emote, stamp, snapshot, and disconnect messages locally', () => {
    const room = createRoom();

    expect(room.connect(joinMessage('remote.sky.01'))).toMatchObject({
      ok: true,
      snapshot: {
        room: {
          remotePlayerCount: 1,
        },
      },
    });
    expect(
      room.send({
        schemaVersion: 1,
        messageId: 'ws.pose.1',
        sentAtMs: 1100,
        type: 'pose',
        playerId: 'remote.sky.01',
        pose,
      }),
    ).toMatchObject({
      ok: true,
      snapshotMessage: {
        type: 'snapshot',
        players: [
          {
            playerId: 'remote.sky.01',
          },
        ],
      },
    });
    expect(
      room.send({
        schemaVersion: 1,
        messageId: 'ws.emote.1',
        sentAtMs: 1200,
        type: 'emote',
        playerId: 'remote.sky.01',
        emoteId: 'emote.wave',
      }),
    ).toMatchObject({ ok: true });
    expect(
      room.send({
        schemaVersion: 1,
        messageId: 'ws.stamp.1',
        sentAtMs: 1300,
        type: 'stamp',
        playerId: 'remote.sky.01',
        stampId: 'stamp.wave_ring',
        pose,
      }),
    ).toMatchObject({
      ok: true,
      snapshot: {
        activeStamps: [
          {
            stampId: 'stamp.wave_ring',
          },
        ],
      },
    });
    expect(room.disconnect('remote.sky.01', 1400)).toMatchObject({
      ok: true,
      snapshot: {
        players: [
          {
            connected: false,
            status: 'disconnected',
          },
        ],
      },
    });
  });

  it('rejects invalid payloads without corrupting room state', () => {
    const room = createRoom();

    room.connect(joinMessage('remote.sky.01'));
    expect(
      room.send({
        schemaVersion: 1,
        messageId: 'ws.bad.1',
        sentAtMs: 1100,
        type: 'pose',
        playerId: 'remote.sky.01',
        pose: {
          ...pose,
          object3D: 'three-object',
          sequence: -1,
        },
      }),
    ).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'invalid-message',
      },
      snapshot: {
        room: {
          remotePlayerCount: 1,
        },
      },
    });
    expect(room.getSnapshot().players).toHaveLength(1);
  });

  it('reports room full, rate limited, and closed transport diagnostics', () => {
    const room = createRoom({
      maxRemotePlayers: 1,
      messagesPerPlayerPerSecond: 2,
    });

    room.connect(joinMessage('remote.sky.01'));
    expect(room.connect(joinMessage('remote.mint.02', 'avatar.courier_mint'))).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'room-full',
      },
    });
    room.send({
      schemaVersion: 1,
      messageId: 'ws.pose.1',
      sentAtMs: 1100,
      type: 'pose',
      playerId: 'remote.sky.01',
      pose,
    });
    expect(
      room.send({
        schemaVersion: 1,
        messageId: 'ws.pose.2',
        sentAtMs: 1150,
        type: 'pose',
        playerId: 'remote.sky.01',
        pose: {
          ...pose,
          sequence: 2,
        },
      }),
    ).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'rate-limited',
      },
    });
    room.close();
    expect(room.send(joinMessage('remote.closed'))).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'transport-unavailable',
      },
    });
  });
});

function createRoom(limits = {}) {
  return new SocialWebSocketRoomPrototype({
    avatars,
    emotes,
    limits,
    roomId: 'room.showcase',
    stamps,
  });
}

function joinMessage(playerId: string, avatarId = 'avatar.courier_sky') {
  return {
    schemaVersion: 1 as const,
    messageId: `ws.join.${playerId}`,
    sentAtMs: 1000,
    type: 'join' as const,
    roomId: 'room.showcase',
    playerId,
    avatarId,
    displayName: playerId,
  };
}
