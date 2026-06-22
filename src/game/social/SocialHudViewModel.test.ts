import { describe, expect, it } from 'vitest';

import { createSocialHudViewModel } from './SocialHudViewModel';
import type { SocialRuntimeSnapshot } from './SocialRuntimeState';

describe('social hud view model', () => {
  it('reports unavailable social preview without runtime state', () => {
    expect(createSocialHudViewModel({})).toEqual({
      activeStampCount: 0,
      invalidMessageCount: 0,
      prompt: 'Social preview unavailable',
      rateLimitedMessageCount: 0,
      remoteCount: 0,
      roomStatus: 'unavailable',
      staleRemoteCount: 0,
      statusLabel: 'Unavailable',
      title: 'Social Layer',
      tone: 'muted',
    });
  });

  it('summarizes remote count and active stamps', () => {
    expect(createSocialHudViewModel({ snapshot: createSnapshot() })).toMatchObject({
      activeStampCount: 1,
      prompt: '1 active social stamp',
      remoteCount: 2,
      roomStatus: 'open',
      statusLabel: 'Room open',
      tone: 'active',
    });
  });

  it('surfaces invalid message and rate-limit warnings', () => {
    expect(
      createSocialHudViewModel({
        snapshot: {
          ...createSnapshot(),
          activeStamps: [],
          invalidMessageCount: 2,
          rateLimitedMessageCount: 1,
          roomFullCount: 1,
          room: {
            ...createSnapshot().room,
            status: 'full',
          },
        },
      }),
    ).toMatchObject({
      prompt: '2 invalid message rejected',
      roomStatus: 'full',
      statusLabel: 'Room full',
      tone: 'warning',
    });
  });
});

function createSnapshot(): SocialRuntimeSnapshot {
  return {
    activeStamps: [
      {
        createdAtMs: 1000,
        expiresAtMs: 3000,
        id: 'stamp-event.001',
        playerId: 'remote.sky.01',
        pose: {
          position: [0, 0.1, 0],
          rotation: [0, 0, 0, 1],
          sequence: 1,
        },
        stampId: 'stamp.wave_ring',
      },
    ],
    diagnostics: [],
    invalidMessageCount: 0,
    players: [],
    rateLimitedMessageCount: 0,
    room: {
      maxRemotePlayers: 10,
      rateLimitedPlayerIds: [],
      remotePlayerCount: 2,
      status: 'open',
    },
    roomFullCount: 0,
    sequence: 2,
    stalePlayerCount: 0,
    staleSnapshotCount: 0,
  };
}
