import { describe, expect, it } from 'vitest';

import {
  SocialNetworkMessageSchema,
  SocialRoomLimitSchema,
  parseSocialNetworkMessage,
} from './socialMessages';

const pose = {
  region: 'hill',
  position: [0, 0.1, 0],
  rotation: [0, 0, 0, 1],
  velocity: [0.1, 0, 0],
  sequence: 3,
};

const base = {
  schemaVersion: 1,
  messageId: 'msg.001',
  sentAtMs: 1000,
};

describe('social network message schema', () => {
  it('parses join, pose, emote, stamp, snapshot, disconnect, serverTime, and error messages', () => {
    const messages = [
      {
        ...base,
        type: 'join',
        roomId: 'room.showcase',
        playerId: 'remote.sky.01',
        avatarId: 'avatar.courier_sky',
        displayName: 'Sky 01',
      },
      {
        ...base,
        type: 'pose',
        messageId: 'msg.002',
        playerId: 'remote.sky.01',
        pose,
      },
      {
        ...base,
        type: 'emote',
        messageId: 'msg.003',
        playerId: 'remote.sky.01',
        emoteId: 'emote.wave',
      },
      {
        ...base,
        type: 'stamp',
        messageId: 'msg.004',
        playerId: 'remote.sky.01',
        stampId: 'stamp.wave_ring',
        pose,
      },
      {
        ...base,
        type: 'snapshot',
        messageId: 'msg.005',
        room: {
          roomId: 'room.showcase',
          status: 'open',
          maxRemotePlayers: 10,
          remotePlayerCount: 1,
          rateLimitedPlayerIds: ['remote.sky.01'],
        },
        players: [
          {
            playerId: 'remote.sky.01',
            avatarId: 'avatar.courier_sky',
            displayName: 'Sky 01',
            pose,
            connected: true,
            stale: false,
            lastSeenAtMs: 1000,
          },
        ],
        activeStamps: [
          {
            id: 'stamp-event.001',
            playerId: 'remote.sky.01',
            stampId: 'stamp.wave_ring',
            pose,
            createdAtMs: 1000,
            expiresAtMs: 3000,
          },
        ],
        diagnostics: [
          {
            code: 'rate-limited',
            message: 'Player exceeded prototype message rate.',
            playerId: 'remote.sky.01',
            dropped: true,
          },
        ],
      },
      {
        ...base,
        type: 'disconnect',
        messageId: 'msg.006',
        playerId: 'remote.sky.01',
        reason: 'left',
      },
      {
        ...base,
        type: 'serverTime',
        messageId: 'msg.007',
        serverTimeMs: 1050,
      },
      {
        ...base,
        type: 'error',
        messageId: 'msg.008',
        code: 'room-full',
        message: 'Room is full.',
        playerId: 'remote.sky.01',
        relatedMessageId: 'msg.001',
      },
    ];

    expect(messages.every((message) => SocialNetworkMessageSchema.safeParse(message).success)).toBe(
      true,
    );
  });

  it('defines room limit and stale-rate budget contracts', () => {
    expect(
      SocialRoomLimitSchema.safeParse({
        maxRemotePlayers: 10,
        messagesPerPlayerPerSecond: 12,
        staleAfterMs: 5000,
      }).success,
    ).toBe(true);

    expect(
      SocialRoomLimitSchema.safeParse({
        maxRemotePlayers: 12,
        messagesPerPlayerPerSecond: 0,
        staleAfterMs: 100,
      }).success,
    ).toBe(false);
  });

  it('rejects invalid payloads with diagnostics and no mutation side effects', () => {
    const state = {
      applied: [] as string[],
    };
    const invalidPose = {
      ...base,
      type: 'pose',
      playerId: 'remote.sky.01',
      pose: {
        ...pose,
        object3D: 'three-object',
        sequence: -1,
      },
    };

    const result = parseSocialNetworkMessage(invalidPose);

    if (result.ok) {
      state.applied.push(result.message.type);
    }

    if (result.ok) {
      throw new Error('Invalid pose should be rejected.');
    }

    expect(result.diagnostic.code).toBe('invalid-message');
    expect(result.diagnostic.messageId).toBe('msg.001');
    expect(result.diagnostic.playerId).toBe('remote.sky.01');
    expect(result.diagnostic.receivedType).toBe('pose');
    expect(result.diagnostic.dropped).toBe(true);
    expect(state.applied).toEqual([]);
  });

  it('separates unknown message and unsupported version diagnostics', () => {
    const unknownResult = parseSocialNetworkMessage({
      ...base,
      type: 'chat',
      playerId: 'remote.sky.01',
      text: 'out of scope',
    });

    if (unknownResult.ok) {
      throw new Error('Unknown message type should be rejected.');
    }

    expect(unknownResult.diagnostic.code).toBe('unknown-message');
    expect(unknownResult.diagnostic.receivedType).toBe('chat');

    const unsupportedVersionResult = parseSocialNetworkMessage({
      ...base,
      schemaVersion: 2,
      type: 'join',
      roomId: 'room.showcase',
      playerId: 'remote.sky.01',
      avatarId: 'avatar.courier_sky',
      displayName: 'Sky 01',
    });

    if (unsupportedVersionResult.ok) {
      throw new Error('Unsupported message version should be rejected.');
    }

    expect(unsupportedVersionResult.diagnostic.code).toBe('unsupported-version');
    expect(unsupportedVersionResult.diagnostic.receivedType).toBe('join');
  });
});
