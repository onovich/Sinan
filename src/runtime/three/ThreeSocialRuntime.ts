import * as THREE from 'three';

import type {
  RuntimeSocialDiagnostics,
  RuntimeSocialRemotePlayer,
  RuntimeSocialState,
  RuntimeSocialStampEvent,
  RuntimeStyleQualityProfile,
  Vec3,
} from '../RuntimeTypes';
import { disposeObjectTree } from './ThreeObjectResources';

interface RemoteAvatarBinding {
  object: THREE.Object3D;
  player: RuntimeSocialRemotePlayer;
}

export class ThreeSocialRuntime {
  private readonly group = new THREE.Group();
  private readonly remoteByPlayerId = new Map<string, RemoteAvatarBinding>();
  private readonly stampById = new Map<string, THREE.Object3D>();
  private lowEndSuppressedRemoteCount = 0;
  private lowEndSuppressedStampCount = 0;
  private qualityProfile: RuntimeStyleQualityProfile = 'standard';
  private root: THREE.Object3D | undefined;
  private state: RuntimeSocialState | undefined;

  constructor() {
    this.group.name = 'social-remote-avatars';
  }

  setRoot(root: THREE.Object3D | undefined): void {
    this.root = root;

    if (!root) {
      this.group.removeFromParent();
      return;
    }

    if (!this.group.parent) {
      root.add(this.group);
    }
  }

  setQualityProfile(profile: RuntimeStyleQualityProfile): void {
    this.qualityProfile = profile;
    this.rebuild();
  }

  setState(state: RuntimeSocialState | undefined): void {
    this.state = state ? cloneSocialState(state) : undefined;
    this.rebuild();
  }

  getDiagnostics(): RuntimeSocialDiagnostics {
    const players = this.state?.players ?? [];

    return {
      activeStampCount: this.state?.activeStamps.length ?? 0,
      disconnectedRemoteCount: players.filter((player) => !player.connected).length,
      invalidMessageCount: this.state?.invalidMessageCount ?? 0,
      lowEndSuppressedStampCount: this.lowEndSuppressedStampCount,
      lowEndSuppressedRemoteCount: this.lowEndSuppressedRemoteCount,
      rateLimitedMessageCount: this.state?.rateLimitedMessageCount ?? 0,
      remoteCount: players.length,
      roomFullCount: this.state?.roomFullCount ?? 0,
      roomStatus: this.state?.room.status ?? 'open',
      staleRemoteCount: players.filter((player) => player.stale).length,
      staleSnapshotCount: this.state?.staleSnapshotCount ?? 0,
      visibleRemoteCount: this.remoteByPlayerId.size,
      visibleStampCount: this.stampById.size,
    };
  }

  dispose(): void {
    this.clearRemotes();
    this.clearStamps();
    this.group.removeFromParent();
    this.state = undefined;
    this.lowEndSuppressedRemoteCount = 0;
    this.lowEndSuppressedStampCount = 0;
  }

  private rebuild(): void {
    this.clearRemotes();
    this.clearStamps();
    this.lowEndSuppressedRemoteCount = 0;
    this.lowEndSuppressedStampCount = 0;

    if (!this.state) {
      return;
    }

    for (const player of this.state.players) {
      if (this.shouldSuppressRemote(player)) {
        this.lowEndSuppressedRemoteCount += 1;
        continue;
      }

      const object = createRemoteAvatarObject(player);
      this.group.add(object);
      this.remoteByPlayerId.set(player.playerId, {
        object,
        player: clonePlayer(player),
      });
    }

    for (const stamp of this.state.activeStamps) {
      if (this.shouldSuppressStamp()) {
        this.lowEndSuppressedStampCount += 1;
        continue;
      }

      const object = createStampObject(stamp);
      this.group.add(object);
      this.stampById.set(stamp.id, object);
    }

    if (this.root && !this.group.parent) {
      this.root.add(this.group);
    }
  }

  private clearRemotes(): void {
    for (const binding of this.remoteByPlayerId.values()) {
      binding.object.removeFromParent();
      disposeObjectTree(binding.object);
    }

    this.remoteByPlayerId.clear();
    this.group.clear();
  }

  private clearStamps(): void {
    for (const object of this.stampById.values()) {
      object.removeFromParent();
      disposeObjectTree(object);
    }

    this.stampById.clear();
  }

  private shouldSuppressRemote(player: RuntimeSocialRemotePlayer): boolean {
    return this.qualityProfile === 'low-end' && (!player.connected || player.stale);
  }

  private shouldSuppressStamp(): boolean {
    return this.qualityProfile === 'low-end';
  }
}

function createRemoteAvatarObject(player: RuntimeSocialRemotePlayer): THREE.Object3D {
  const root = new THREE.Group();
  const color = getAvatarColor(player.avatarId);
  const opacity = player.connected && !player.stale ? 0.92 : 0.38;
  const material = new THREE.MeshBasicMaterial({
    color,
    opacity,
    transparent: opacity < 1,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.38, 4, 10), material);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), material);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.015, 6, 24),
    new THREE.MeshBasicMaterial({
      color: player.stale ? 0xb8a15c : 0xd9eadf,
      opacity: player.connected ? 0.65 : 0.28,
      transparent: true,
    }),
  );

  root.name = `social-remote:${player.playerId}`;
  root.userData = {
    avatarId: player.avatarId,
    connected: player.connected,
    playerId: player.playerId,
    socialRemoteAvatar: true,
    stale: player.stale,
    status: player.status,
  };
  body.position.y = 0.34;
  head.position.y = 0.72;
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.03;
  root.add(body);
  root.add(head);
  root.add(ring);

  if (player.pose) {
    root.position.set(...player.pose.position);
    root.quaternion.set(...player.pose.rotation);
  }

  root.visible = player.connected || player.stale || player.status === 'disconnected';

  return root;
}

function createStampObject(stamp: RuntimeSocialStampEvent): THREE.Object3D {
  const root = new THREE.Group();
  const color = getAvatarColor(stamp.stampId);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.025, 8, 32),
    new THREE.MeshBasicMaterial({
      color,
      depthWrite: false,
      opacity: 0.82,
      transparent: true,
    }),
  );
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.14, 0),
    new THREE.MeshBasicMaterial({
      color,
      depthWrite: false,
      opacity: 0.92,
      transparent: true,
    }),
  );

  root.name = `social-stamp:${stamp.id}`;
  root.userData = {
    playerId: stamp.playerId,
    socialStamp: true,
    stampId: stamp.stampId,
  };
  root.position.set(...stamp.pose.position);
  root.quaternion.set(...stamp.pose.rotation);
  ring.rotation.x = Math.PI / 2;
  core.position.y = 0.32;
  root.add(ring);
  root.add(core);

  return root;
}

function getAvatarColor(avatarId: string): number {
  let hash = 0;

  for (const char of avatarId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  const hue = hash % 360;
  const color = new THREE.Color();

  color.setHSL(hue / 360, 0.58, 0.58);

  return color.getHex();
}

function cloneSocialState(state: RuntimeSocialState): RuntimeSocialState {
  return {
    activeStamps: state.activeStamps.map((stamp) => ({
      createdAtMs: stamp.createdAtMs,
      expiresAtMs: stamp.expiresAtMs,
      id: stamp.id,
      playerId: stamp.playerId,
      pose: {
        ...(stamp.pose.region ? { region: stamp.pose.region } : {}),
        position: [...stamp.pose.position] as Vec3,
        rotation: [...stamp.pose.rotation],
        sequence: stamp.pose.sequence,
        ...(stamp.pose.velocity ? { velocity: [...stamp.pose.velocity] as Vec3 } : {}),
      },
      stampId: stamp.stampId,
    })),
    invalidMessageCount: state.invalidMessageCount,
    players: state.players.map(clonePlayer),
    rateLimitedMessageCount: state.rateLimitedMessageCount,
    room: {
      maxRemotePlayers: state.room.maxRemotePlayers,
      rateLimitedPlayerIds: [...state.room.rateLimitedPlayerIds],
      remotePlayerCount: state.room.remotePlayerCount,
      status: state.room.status,
    },
    roomFullCount: state.roomFullCount,
    sequence: state.sequence,
    stalePlayerCount: state.stalePlayerCount,
    staleSnapshotCount: state.staleSnapshotCount,
  };
}

function clonePlayer(player: RuntimeSocialRemotePlayer): RuntimeSocialRemotePlayer {
  return {
    ...(player.activeEmoteId ? { activeEmoteId: player.activeEmoteId } : {}),
    avatarId: player.avatarId,
    connected: player.connected,
    displayName: player.displayName,
    lastSeenAtMs: player.lastSeenAtMs,
    playerId: player.playerId,
    ...(player.pose
      ? {
          pose: {
            ...(player.pose.region ? { region: player.pose.region } : {}),
            position: [...player.pose.position] as Vec3,
            rotation: [...player.pose.rotation],
            sequence: player.pose.sequence,
            ...(player.pose.velocity ? { velocity: [...player.pose.velocity] as Vec3 } : {}),
          },
        }
      : {}),
    sequence: player.sequence,
    stale: player.stale,
    status: player.status,
  };
}
