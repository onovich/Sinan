import { describe, expect, it } from 'vitest';

import type {
  SocialAvatarData,
  SocialEmoteData,
  SocialStampData,
} from '../../schemas/social.schema';
import { SocialRuntimeState, type SocialRuntimeStateOptions } from './SocialRuntimeState';

const avatars: SocialAvatarData[] = [
  {
    schemaVersion: 1,
    id: 'avatar.courier_sky',
    displayName: 'Sky Courier',
    shortLabel: 'SKY',
    bodyColor: '#4BA3FF',
    accentColor: '#F8D66D',
    fixtureScale: 1,
    lowEndBehavior: 'visible',
  },
  {
    schemaVersion: 1,
    id: 'avatar.courier_mint',
    displayName: 'Mint Courier',
    shortLabel: 'MNT',
    bodyColor: '#46C28B',
    accentColor: '#F3F5F0',
    fixtureScale: 1,
    lowEndBehavior: 'badge-only',
  },
];

const emotes: SocialEmoteData[] = [
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

const stamps: SocialStampData[] = [
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

const pose = {
  region: 'hill',
  position: [0, 0.1, 0] as [number, number, number],
  rotation: [0, 0, 0, 1] as [number, number, number, number],
  sequence: 1,
};

describe('social runtime state', () => {
  it('runs join, pose, emote, stamp, disconnect, and reset deterministically', () => {
    const runtime = createRuntime();

    expect(join(runtime, 'remote.sky.01')).toMatchObject({ ok: true });
    expect(
      runtime.apply({
        schemaVersion: 1,
        messageId: 'msg.pose.1',
        sentAtMs: 1100,
        type: 'pose',
        playerId: 'remote.sky.01',
        pose,
      }),
    ).toMatchObject({
      ok: true,
      snapshot: {
        players: [
          {
            playerId: 'remote.sky.01',
            pose: {
              sequence: 1,
            },
            status: 'connected',
          },
        ],
      },
    });
    expect(
      runtime.apply({
        schemaVersion: 1,
        messageId: 'msg.emote.1',
        sentAtMs: 1200,
        type: 'emote',
        playerId: 'remote.sky.01',
        emoteId: 'emote.wave',
      }),
    ).toMatchObject({
      ok: true,
      snapshot: {
        players: [
          {
            activeEmoteId: 'emote.wave',
          },
        ],
      },
    });
    expect(
      runtime.apply({
        schemaVersion: 1,
        messageId: 'msg.stamp.1',
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
            id: 'msg.stamp.1',
            stampId: 'stamp.wave_ring',
          },
        ],
      },
    });
    expect(
      runtime.apply({
        schemaVersion: 1,
        messageId: 'msg.disconnect.1',
        sentAtMs: 1400,
        type: 'disconnect',
        playerId: 'remote.sky.01',
        reason: 'left',
      }),
    ).toMatchObject({
      ok: true,
      snapshot: {
        players: [
          {
            connected: false,
            stale: true,
            status: 'disconnected',
          },
        ],
      },
    });
    expect(runtime.reset()).toEqual({
      activeStamps: [],
      diagnostics: [],
      invalidMessageCount: 0,
      players: [],
      rateLimitedMessageCount: 0,
      room: {
        maxRemotePlayers: 10,
        rateLimitedPlayerIds: [],
        remotePlayerCount: 0,
        status: 'open',
      },
      roomFullCount: 0,
      sequence: 0,
      stalePlayerCount: 0,
      staleSnapshotCount: 0,
    });
  });

  it('rejects duplicate joins, missing players, unknown ids, stale poses, and malformed messages', () => {
    const runtime = createRuntime();

    join(runtime, 'remote.sky.01');

    expect(join(runtime, 'remote.sky.01')).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'invalid-message',
      },
    });
    expect(
      runtime.apply({
        schemaVersion: 1,
        messageId: 'msg.pose.missing',
        sentAtMs: 1200,
        type: 'pose',
        playerId: 'remote.missing',
        pose,
      }),
    ).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'invalid-message',
      },
    });
    expect(
      runtime.apply({
        schemaVersion: 1,
        messageId: 'msg.emote.unknown',
        sentAtMs: 1300,
        type: 'emote',
        playerId: 'remote.sky.01',
        emoteId: 'emote.missing',
      }),
    ).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'invalid-message',
      },
    });
    runtime.apply({
      schemaVersion: 1,
      messageId: 'msg.pose.1',
      sentAtMs: 1400,
      type: 'pose',
      playerId: 'remote.sky.01',
      pose,
    });

    expect(
      runtime.apply({
        schemaVersion: 1,
        messageId: 'msg.pose.stale',
        sentAtMs: 1500,
        type: 'pose',
        playerId: 'remote.sky.01',
        pose: {
          ...pose,
          sequence: 1,
        },
      }),
    ).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'stale-snapshot',
      },
    });
    expect(
      runtime.apply({
        schemaVersion: 1,
        messageId: 'msg.bad',
        sentAtMs: 1600,
        type: 'stamp',
        playerId: 'remote.sky.01',
        stampId: 'stamp.wave_ring',
        pose: {
          ...pose,
          object3D: 'three-object',
        },
      }),
    ).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'invalid-message',
      },
    });
    expect(runtime.getSnapshot()).toMatchObject({
      invalidMessageCount: 4,
      staleSnapshotCount: 1,
    });
    expect(runtime.getSnapshot().players).toHaveLength(1);
  });

  it('handles room full, rate limits, stale players, and expired stamps', () => {
    const runtime = createRuntime({
      maxRemotePlayers: 1,
      messagesPerPlayerPerSecond: 2,
      staleAfterMs: 1000,
    });

    join(runtime, 'remote.sky.01');
    expect(join(runtime, 'remote.mint.02', 'avatar.courier_mint')).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'room-full',
      },
    });
    runtime.apply({
      schemaVersion: 1,
      messageId: 'msg.pose.1',
      sentAtMs: 1200,
      type: 'pose',
      playerId: 'remote.sky.01',
      pose,
    });
    expect(
      runtime.apply({
        schemaVersion: 1,
        messageId: 'msg.pose.rate',
        sentAtMs: 1250,
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
    runtime.apply({
      schemaVersion: 1,
      messageId: 'msg.stamp.1',
      sentAtMs: 2300,
      type: 'stamp',
      playerId: 'remote.sky.01',
      stampId: 'stamp.wave_ring',
      pose,
    });

    expect(runtime.markStale(4601)).toMatchObject({
      activeStamps: [],
      players: [
        {
          stale: true,
          status: 'stale',
        },
      ],
      rateLimitedMessageCount: 1,
      roomFullCount: 1,
      stalePlayerCount: 1,
    });
  });

  it('applies snapshots without corrupting known catalog boundaries', () => {
    const runtime = createRuntime();

    expect(
      runtime.apply({
        schemaVersion: 1,
        messageId: 'msg.snapshot.1',
        sentAtMs: 2000,
        type: 'snapshot',
        room: {
          roomId: 'room.showcase',
          status: 'open',
          maxRemotePlayers: 10,
          remotePlayerCount: 1,
          rateLimitedPlayerIds: [],
        },
        players: [
          {
            playerId: 'remote.sky.01',
            avatarId: 'avatar.courier_sky',
            displayName: 'Sky 01',
            pose,
            connected: true,
            stale: false,
            lastSeenAtMs: 2000,
          },
        ],
        activeStamps: [
          {
            id: 'stamp-event.001',
            playerId: 'remote.sky.01',
            stampId: 'stamp.wave_ring',
            pose,
            createdAtMs: 2000,
            expiresAtMs: 3000,
          },
        ],
        diagnostics: [],
      }),
    ).toMatchObject({
      ok: true,
      snapshot: {
        activeStamps: [
          {
            id: 'stamp-event.001',
          },
        ],
        players: [
          {
            playerId: 'remote.sky.01',
          },
        ],
      },
    });
    expect(
      runtime.apply({
        schemaVersion: 1,
        messageId: 'msg.snapshot.bad',
        sentAtMs: 2100,
        type: 'snapshot',
        room: {
          roomId: 'room.showcase',
          status: 'open',
          maxRemotePlayers: 10,
          remotePlayerCount: 1,
          rateLimitedPlayerIds: [],
        },
        players: [
          {
            playerId: 'remote.bad',
            avatarId: 'avatar.missing',
            displayName: 'Bad',
            connected: true,
            stale: false,
            lastSeenAtMs: 2100,
          },
        ],
        activeStamps: [],
        diagnostics: [],
      }),
    ).toMatchObject({
      ok: false,
      diagnostic: {
        code: 'invalid-message',
      },
    });
    expect(runtime.getSnapshot().players).toHaveLength(1);
  });
});

function createRuntime(limits: SocialRuntimeStateOptions['limits'] = {}) {
  return new SocialRuntimeState({
    avatars,
    emotes,
    limits,
    stamps,
  });
}

function join(runtime: SocialRuntimeState, playerId: string, avatarId = 'avatar.courier_sky') {
  return runtime.apply({
    schemaVersion: 1,
    messageId: `msg.join.${playerId}`,
    sentAtMs: 1000,
    type: 'join',
    roomId: 'room.showcase',
    playerId,
    avatarId,
    displayName: playerId,
  });
}
