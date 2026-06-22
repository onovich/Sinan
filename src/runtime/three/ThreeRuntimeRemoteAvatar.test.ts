import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import type { RuntimeSocialState } from '../RuntimeTypes';
import { ThreeRuntime } from './ThreeRuntime';
import { ThreeSocialRuntime } from './ThreeSocialRuntime';

describe('Three runtime remote avatar social visuals', () => {
  it('renders remote avatars through the public runtime bridge', () => {
    const runtime = new ThreeRuntime();

    runtime.setSocialState(createSocialState());

    expect(runtime.getSocialDiagnostics()).toMatchObject({
      activeStampCount: 1,
      disconnectedRemoteCount: 1,
      invalidMessageCount: 1,
      lowEndSuppressedRemoteCount: 0,
      remoteCount: 3,
      roomStatus: 'open',
      staleRemoteCount: 2,
      visibleRemoteCount: 3,
    });
  });

  it('suppresses stale and disconnected remote avatars on low-end', () => {
    const runtime = new ThreeRuntime();

    runtime.setSocialState(createSocialState());
    runtime.setStyleQualityProfile('low-end');

    expect(runtime.getSocialDiagnostics()).toMatchObject({
      lowEndSuppressedRemoteCount: 2,
      remoteCount: 3,
      staleRemoteCount: 2,
      visibleRemoteCount: 1,
    });
  });

  it('updates pose diagnostics and clears avatars when state is removed', () => {
    const runtime = new ThreeSocialRuntime();
    const root = new THREE.Group();

    runtime.setRoot(root);
    runtime.setState(createSocialState());

    expect(root.children).toHaveLength(1);
    expect(runtime.getDiagnostics().visibleRemoteCount).toBe(3);

    runtime.setState({
      ...createSocialState(),
      players: [
        {
          ...createSocialState().players[0],
          pose: {
            position: [2, 0.2, 0],
            rotation: [0, 0, 0, 1],
            sequence: 2,
          },
          sequence: 2,
        },
      ],
      room: {
        ...createSocialState().room,
        remotePlayerCount: 1,
      },
      stalePlayerCount: 0,
    });

    expect(runtime.getDiagnostics()).toMatchObject({
      remoteCount: 1,
      visibleRemoteCount: 1,
    });
    runtime.setState(undefined);
    expect(runtime.getDiagnostics()).toMatchObject({
      remoteCount: 0,
      visibleRemoteCount: 0,
    });
  });

  it('disposes remote avatar geometry and materials', () => {
    const runtime = new ThreeSocialRuntime();
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose');

    try {
      runtime.setRoot(new THREE.Group());
      runtime.setState(createSocialState());
      runtime.dispose();

      expect(geometryDispose).toHaveBeenCalled();
      expect(materialDispose).toHaveBeenCalled();
      expect(runtime.getDiagnostics()).toMatchObject({
        remoteCount: 0,
        visibleRemoteCount: 0,
      });
    } finally {
      runtime.dispose();
      geometryDispose.mockRestore();
      materialDispose.mockRestore();
    }
  });
});

function createSocialState(): RuntimeSocialState {
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
    invalidMessageCount: 1,
    players: [
      {
        avatarId: 'avatar.courier_sky',
        connected: true,
        displayName: 'Sky 01',
        lastSeenAtMs: 1000,
        playerId: 'remote.sky.01',
        pose: {
          position: [0, 0.1, 0],
          region: 'hill',
          rotation: [0, 0, 0, 1],
          sequence: 1,
        },
        sequence: 1,
        stale: false,
        status: 'connected',
      },
      {
        avatarId: 'avatar.courier_mint',
        connected: true,
        displayName: 'Mint 02',
        lastSeenAtMs: 900,
        playerId: 'remote.mint.02',
        pose: {
          position: [1, 0.1, 0],
          region: 'hill',
          rotation: [0, 0, 0, 1],
          sequence: 1,
        },
        sequence: 1,
        stale: true,
        status: 'stale',
      },
      {
        avatarId: 'avatar.courier_rose',
        connected: false,
        displayName: 'Rose 03',
        lastSeenAtMs: 800,
        playerId: 'remote.rose.03',
        pose: {
          position: [2, 0.1, 0],
          region: 'hill',
          rotation: [0, 0, 0, 1],
          sequence: 1,
        },
        sequence: 1,
        stale: true,
        status: 'disconnected',
      },
    ],
    rateLimitedMessageCount: 2,
    room: {
      maxRemotePlayers: 10,
      rateLimitedPlayerIds: ['remote.sky.01'],
      remotePlayerCount: 3,
      status: 'open',
    },
    roomFullCount: 0,
    sequence: 4,
    stalePlayerCount: 1,
    staleSnapshotCount: 0,
  };
}
