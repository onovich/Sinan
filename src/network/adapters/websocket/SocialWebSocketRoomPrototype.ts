import type {
  SocialAvatarData,
  SocialEmoteData,
  SocialStampData,
} from '../../../schemas/social.schema';
import {
  type SocialNetworkDiagnostic,
  type SocialNetworkMessage,
  type SocialPose,
  type SocialRoomLimit,
} from '../../socialMessages';
import { SocialRuntimeState, type SocialRuntimeSnapshot } from '../../../game/social';

export interface SocialWebSocketRoomPrototypeOptions {
  avatars: readonly SocialAvatarData[];
  emotes: readonly SocialEmoteData[];
  limits?: Partial<SocialRoomLimit>;
  roomId: string;
  stamps: readonly SocialStampData[];
}

export type SocialWebSocketRoomPrototypeResult =
  | {
      ok: true;
      message: SocialNetworkMessage;
      snapshot: SocialRuntimeSnapshot;
      snapshotMessage: SocialNetworkMessage;
    }
  | {
      diagnostic: SocialNetworkDiagnostic;
      ok: false;
      snapshot: SocialRuntimeSnapshot;
      snapshotMessage: SocialNetworkMessage;
    };

export class SocialWebSocketRoomPrototype {
  private closed = false;
  private readonly runtime: SocialRuntimeState;

  constructor(private readonly options: SocialWebSocketRoomPrototypeOptions) {
    this.runtime = new SocialRuntimeState({
      avatars: options.avatars,
      emotes: options.emotes,
      limits: options.limits,
      stamps: options.stamps,
    });
  }

  close(): void {
    this.closed = true;
  }

  connect(joinMessage: SocialNetworkMessage): SocialWebSocketRoomPrototypeResult {
    return this.apply(joinMessage);
  }

  createSnapshotMessage(nowMs: number): SocialNetworkMessage {
    return toSnapshotMessage({
      nowMs,
      roomId: this.options.roomId,
      snapshot: this.runtime.getSnapshot(),
    });
  }

  disconnect(playerId: string, nowMs: number): SocialWebSocketRoomPrototypeResult {
    return this.apply({
      schemaVersion: 1,
      messageId: `ws.disconnect.${playerId}.${nowMs}`,
      sentAtMs: nowMs,
      type: 'disconnect',
      playerId,
      reason: 'left',
    });
  }

  getSnapshot(): SocialRuntimeSnapshot {
    return this.runtime.getSnapshot();
  }

  send(input: unknown): SocialWebSocketRoomPrototypeResult {
    return this.apply(input);
  }

  private apply(input: unknown): SocialWebSocketRoomPrototypeResult {
    if (this.closed) {
      const diagnostic: SocialNetworkDiagnostic = {
        code: 'transport-unavailable',
        dropped: true,
        message: 'Local WebSocket room prototype is closed.',
      };

      return {
        diagnostic,
        ok: false,
        snapshot: this.runtime.getSnapshot(),
        snapshotMessage: this.createSnapshotMessage(Date.now()),
      };
    }

    const result = this.runtime.apply(input);
    const snapshotMessage = this.createSnapshotMessage(getSentAtMs(input));

    if (result.ok) {
      return {
        message: result.message,
        ok: true,
        snapshot: result.snapshot,
        snapshotMessage,
      };
    }

    return {
      diagnostic: result.diagnostic,
      ok: false,
      snapshot: result.snapshot,
      snapshotMessage,
    };
  }
}

function toSnapshotMessage(input: {
  nowMs: number;
  roomId: string;
  snapshot: SocialRuntimeSnapshot;
}): SocialNetworkMessage {
  return {
    schemaVersion: 1,
    messageId: `ws.snapshot.${input.nowMs}`,
    sentAtMs: input.nowMs,
    type: 'snapshot',
    room: {
      roomId: input.roomId,
      status: input.snapshot.room.status,
      maxRemotePlayers: input.snapshot.room.maxRemotePlayers,
      remotePlayerCount: input.snapshot.room.remotePlayerCount,
      rateLimitedPlayerIds: input.snapshot.room.rateLimitedPlayerIds,
    },
    players: input.snapshot.players.map((player) => ({
      playerId: player.playerId,
      avatarId: player.avatarId,
      displayName: player.displayName,
      ...(player.pose ? { pose: clonePose(player.pose) } : {}),
      connected: player.connected,
      stale: player.stale,
      lastSeenAtMs: player.lastSeenAtMs,
    })),
    activeStamps: input.snapshot.activeStamps.map((stamp) => ({
      id: stamp.id,
      playerId: stamp.playerId,
      stampId: stamp.stampId,
      pose: clonePose(stamp.pose),
      createdAtMs: stamp.createdAtMs,
      expiresAtMs: stamp.expiresAtMs,
    })),
    diagnostics: input.snapshot.diagnostics,
  };
}

function clonePose(pose: SocialPose): SocialPose {
  return {
    ...(pose.region ? { region: pose.region } : {}),
    position: [...pose.position],
    rotation: [...pose.rotation],
    sequence: pose.sequence,
    ...(pose.velocity ? { velocity: [...pose.velocity] } : {}),
  };
}

function getSentAtMs(input: unknown): number {
  if (typeof input !== 'object' || input === null || !('sentAtMs' in input)) {
    return 0;
  }

  const sentAtMs = input.sentAtMs;

  return typeof sentAtMs === 'number' && Number.isFinite(sentAtMs) ? sentAtMs : 0;
}
