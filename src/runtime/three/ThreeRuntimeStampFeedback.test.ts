import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import type { RuntimeSocialState } from '../RuntimeTypes';
import { ThreeRuntime } from './ThreeRuntime';
import { ThreeSocialRuntime } from './ThreeSocialRuntime';

describe('Three runtime social stamp feedback', () => {
  it('renders active stamp feedback through the public runtime bridge', () => {
    const runtime = new ThreeRuntime();

    runtime.setSocialState(createSocialState());

    expect(runtime.getSocialDiagnostics()).toMatchObject({
      activeStampCount: 1,
      lowEndSuppressedStampCount: 0,
      visibleStampCount: 1,
    });
  });

  it('suppresses stamp feedback on low-end while keeping diagnostics', () => {
    const runtime = new ThreeRuntime();

    runtime.setSocialState(createSocialState());
    runtime.setStyleQualityProfile('low-end');

    expect(runtime.getSocialDiagnostics()).toMatchObject({
      activeStampCount: 1,
      lowEndSuppressedStampCount: 1,
      visibleStampCount: 0,
    });
  });

  it('renders unknown stamp ids with fallback visual color', () => {
    const runtime = new ThreeSocialRuntime();

    runtime.setRoot(new THREE.Group());
    runtime.setState({
      ...createSocialState(),
      activeStamps: [
        {
          ...createSocialState().activeStamps[0],
          id: 'stamp-event.unknown',
          stampId: 'stamp.unknown',
        },
      ],
    });

    expect(runtime.getDiagnostics().visibleStampCount).toBe(1);
  });

  it('clears expired stamp state when the runtime snapshot removes it', () => {
    const runtime = new ThreeSocialRuntime();

    runtime.setRoot(new THREE.Group());
    runtime.setState(createSocialState());
    expect(runtime.getDiagnostics().visibleStampCount).toBe(1);
    runtime.setState({
      ...createSocialState(),
      activeStamps: [],
    });

    expect(runtime.getDiagnostics()).toMatchObject({
      activeStampCount: 0,
      visibleStampCount: 0,
    });
  });

  it('disposes stamp feedback geometry and materials', () => {
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
        activeStampCount: 0,
        visibleStampCount: 0,
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
    invalidMessageCount: 0,
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
    ],
    rateLimitedMessageCount: 0,
    room: {
      maxRemotePlayers: 10,
      rateLimitedPlayerIds: [],
      remotePlayerCount: 1,
      status: 'open',
    },
    roomFullCount: 0,
    sequence: 2,
    stalePlayerCount: 0,
    staleSnapshotCount: 0,
  };
}
