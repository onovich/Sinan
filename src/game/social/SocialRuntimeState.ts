import type {
  SocialAvatarData,
  SocialEmoteData,
  SocialStampData,
} from '../../schemas/social.schema';
import {
  parseSocialNetworkMessage,
  type SocialNetworkDiagnostic,
  type SocialNetworkMessage,
  type SocialPose,
  type SocialRoomLimit,
} from '../../network/socialMessages';

export type SocialRemoteStatus = 'connected' | 'disconnected' | 'stale';

export interface SocialRuntimeRemotePlayer {
  activeEmoteId?: string;
  avatarId: string;
  connected: boolean;
  displayName: string;
  lastSeenAtMs: number;
  playerId: string;
  pose?: SocialPose;
  sequence: number;
  stale: boolean;
  status: SocialRemoteStatus;
}

export interface SocialRuntimeStampEvent {
  createdAtMs: number;
  expiresAtMs: number;
  id: string;
  playerId: string;
  pose: SocialPose;
  stampId: string;
}

export interface SocialRuntimeSnapshot {
  activeStamps: SocialRuntimeStampEvent[];
  diagnostics: SocialNetworkDiagnostic[];
  invalidMessageCount: number;
  players: SocialRuntimeRemotePlayer[];
  rateLimitedMessageCount: number;
  room: {
    maxRemotePlayers: number;
    rateLimitedPlayerIds: string[];
    remotePlayerCount: number;
    status: 'open' | 'full';
  };
  roomFullCount: number;
  sequence: number;
  stalePlayerCount: number;
  staleSnapshotCount: number;
}

export type SocialRuntimeApplyResult =
  | {
      message: SocialNetworkMessage;
      ok: true;
      snapshot: SocialRuntimeSnapshot;
    }
  | {
      diagnostic: SocialNetworkDiagnostic;
      ok: false;
      snapshot: SocialRuntimeSnapshot;
    };

export interface SocialRuntimeStateOptions {
  avatars: readonly SocialAvatarData[];
  emotes: readonly SocialEmoteData[];
  limits?: Partial<SocialRoomLimit>;
  stamps: readonly SocialStampData[];
}

const defaultLimits: SocialRoomLimit = {
  maxRemotePlayers: 10,
  messagesPerPlayerPerSecond: 12,
  staleAfterMs: 5000,
};

export class SocialRuntimeState {
  private readonly avatarIds: ReadonlySet<string>;
  private readonly emoteIds: ReadonlySet<string>;
  private readonly limits: SocialRoomLimit;
  private readonly stampIds: ReadonlySet<string>;
  private readonly stampLifetimes: ReadonlyMap<string, number>;
  private readonly players = new Map<string, SocialRuntimeRemotePlayer>();
  private readonly messageTimesByPlayer = new Map<string, number[]>();
  private readonly activeStamps = new Map<string, SocialRuntimeStampEvent>();
  private diagnostics: SocialNetworkDiagnostic[] = [];
  private invalidMessageCount = 0;
  private rateLimitedMessageCount = 0;
  private roomFullCount = 0;
  private sequence = 0;
  private staleSnapshotCount = 0;

  constructor(options: SocialRuntimeStateOptions) {
    this.avatarIds = new Set(options.avatars.map((avatar) => avatar.id));
    this.emoteIds = new Set(options.emotes.map((emote) => emote.id));
    this.stampIds = new Set(options.stamps.map((stamp) => stamp.id));
    this.stampLifetimes = new Map(options.stamps.map((stamp) => [stamp.id, stamp.lifetimeMs]));
    this.limits = {
      ...defaultLimits,
      ...options.limits,
    };
  }

  apply(input: unknown): SocialRuntimeApplyResult {
    const parsed = parseSocialNetworkMessage(input);

    if (!parsed.ok) {
      return this.reject(parsed.diagnostic);
    }

    const message = parsed.message;
    const rateLimited = this.getRateLimitDiagnostic(message);

    if (rateLimited) {
      this.rateLimitedMessageCount += 1;
      return this.reject(rateLimited);
    }

    this.pruneExpired(message.sentAtMs);

    switch (message.type) {
      case 'join':
        return this.applyJoin(message);
      case 'pose':
        return this.applyPose(message);
      case 'emote':
        return this.applyEmote(message);
      case 'stamp':
        return this.applyStamp(message);
      case 'snapshot':
        return this.applySnapshot(message);
      case 'disconnect':
        return this.applyDisconnect(message);
      case 'serverTime':
      case 'error':
        return this.accept(message);
    }
  }

  getSnapshot(): SocialRuntimeSnapshot {
    const players = [...this.players.values()]
      .map(clonePlayer)
      .sort((left, right) => left.playerId.localeCompare(right.playerId));
    const activeStamps = [...this.activeStamps.values()]
      .map(cloneStamp)
      .sort((left, right) => left.id.localeCompare(right.id));
    const rateLimitedPlayerIds = [...this.messageTimesByPlayer.entries()]
      .filter(([, times]) => times.length >= this.limits.messagesPerPlayerPerSecond)
      .map(([playerId]) => playerId)
      .sort((left, right) => left.localeCompare(right));

    return {
      activeStamps,
      diagnostics: this.diagnostics.map((diagnostic) => ({ ...diagnostic })),
      invalidMessageCount: this.invalidMessageCount,
      players,
      rateLimitedMessageCount: this.rateLimitedMessageCount,
      room: {
        maxRemotePlayers: this.limits.maxRemotePlayers,
        rateLimitedPlayerIds,
        remotePlayerCount: players.filter((player) => player.connected).length,
        status:
          players.filter((player) => player.connected).length >= this.limits.maxRemotePlayers
            ? 'full'
            : 'open',
      },
      roomFullCount: this.roomFullCount,
      sequence: this.sequence,
      stalePlayerCount: players.filter((player) => player.stale).length,
      staleSnapshotCount: this.staleSnapshotCount,
    };
  }

  markStale(nowMs: number): SocialRuntimeSnapshot {
    for (const player of this.players.values()) {
      if (!player.connected || nowMs - player.lastSeenAtMs <= this.limits.staleAfterMs) {
        continue;
      }

      player.stale = true;
      player.status = 'stale';
    }

    this.pruneExpired(nowMs);

    return this.getSnapshot();
  }

  reset(): SocialRuntimeSnapshot {
    this.players.clear();
    this.messageTimesByPlayer.clear();
    this.activeStamps.clear();
    this.diagnostics = [];
    this.invalidMessageCount = 0;
    this.rateLimitedMessageCount = 0;
    this.roomFullCount = 0;
    this.sequence = 0;
    this.staleSnapshotCount = 0;

    return this.getSnapshot();
  }

  private applyJoin(
    message: Extract<SocialNetworkMessage, { type: 'join' }>,
  ): SocialRuntimeApplyResult {
    if (!this.avatarIds.has(message.avatarId)) {
      return this.reject(
        createDiagnostic(
          message,
          'invalid-message',
          `Unknown social avatar "${message.avatarId}".`,
        ),
      );
    }

    if (this.players.has(message.playerId)) {
      return this.reject(
        createDiagnostic(message, 'invalid-message', 'Remote player already joined.'),
      );
    }

    if (this.connectedPlayerCount() >= this.limits.maxRemotePlayers) {
      this.roomFullCount += 1;
      return this.reject(createDiagnostic(message, 'room-full', 'Social room is full.'));
    }

    this.sequence += 1;
    this.players.set(message.playerId, {
      avatarId: message.avatarId,
      connected: true,
      displayName: message.displayName,
      lastSeenAtMs: message.sentAtMs,
      playerId: message.playerId,
      sequence: 0,
      stale: false,
      status: 'connected',
    });

    return this.accept(message);
  }

  private applyPose(
    message: Extract<SocialNetworkMessage, { type: 'pose' }>,
  ): SocialRuntimeApplyResult {
    const player = this.players.get(message.playerId);

    if (!player || !player.connected) {
      return this.reject(
        createDiagnostic(message, 'invalid-message', 'Remote player is not joined.'),
      );
    }

    if (message.pose.sequence <= player.sequence) {
      this.staleSnapshotCount += 1;
      return this.reject(createDiagnostic(message, 'stale-snapshot', 'Pose sequence is stale.'));
    }

    this.sequence += 1;
    this.players.set(message.playerId, {
      ...player,
      lastSeenAtMs: message.sentAtMs,
      pose: clonePose(message.pose),
      sequence: message.pose.sequence,
      stale: false,
      status: 'connected',
    });

    return this.accept(message);
  }

  private applyEmote(
    message: Extract<SocialNetworkMessage, { type: 'emote' }>,
  ): SocialRuntimeApplyResult {
    const player = this.players.get(message.playerId);

    if (!player || !player.connected) {
      return this.reject(
        createDiagnostic(message, 'invalid-message', 'Remote player is not joined.'),
      );
    }

    if (!this.emoteIds.has(message.emoteId)) {
      return this.reject(
        createDiagnostic(message, 'invalid-message', `Unknown social emote "${message.emoteId}".`),
      );
    }

    this.sequence += 1;
    this.players.set(message.playerId, {
      ...player,
      activeEmoteId: message.emoteId,
      lastSeenAtMs: message.sentAtMs,
      stale: false,
      status: 'connected',
    });

    return this.accept(message);
  }

  private applyStamp(
    message: Extract<SocialNetworkMessage, { type: 'stamp' }>,
  ): SocialRuntimeApplyResult {
    const player = this.players.get(message.playerId);

    if (!player || !player.connected) {
      return this.reject(
        createDiagnostic(message, 'invalid-message', 'Remote player is not joined.'),
      );
    }

    if (!this.stampIds.has(message.stampId)) {
      return this.reject(
        createDiagnostic(message, 'invalid-message', `Unknown social stamp "${message.stampId}".`),
      );
    }

    this.sequence += 1;
    this.players.set(message.playerId, {
      ...player,
      lastSeenAtMs: message.sentAtMs,
      stale: false,
      status: 'connected',
    });
    this.activeStamps.set(message.messageId, {
      createdAtMs: message.sentAtMs,
      expiresAtMs: message.sentAtMs + (this.stampLifetimes.get(message.stampId) ?? 3000),
      id: message.messageId,
      playerId: message.playerId,
      pose: clonePose(message.pose),
      stampId: message.stampId,
    });

    return this.accept(message);
  }

  private applySnapshot(
    message: Extract<SocialNetworkMessage, { type: 'snapshot' }>,
  ): SocialRuntimeApplyResult {
    for (const player of message.players) {
      if (!this.avatarIds.has(player.avatarId)) {
        return this.reject(
          createDiagnostic(
            message,
            'invalid-message',
            `Unknown social avatar "${player.avatarId}".`,
            player.playerId,
          ),
        );
      }
    }

    this.sequence += 1;
    this.players.clear();

    for (const player of message.players) {
      this.players.set(player.playerId, {
        avatarId: player.avatarId,
        connected: player.connected,
        displayName: player.displayName,
        lastSeenAtMs: player.lastSeenAtMs,
        playerId: player.playerId,
        ...(player.pose
          ? { pose: clonePose(player.pose), sequence: player.pose.sequence }
          : { sequence: 0 }),
        stale: player.stale,
        status: player.connected ? (player.stale ? 'stale' : 'connected') : 'disconnected',
      });
    }

    this.activeStamps.clear();

    for (const stamp of message.activeStamps) {
      if (this.stampIds.has(stamp.stampId)) {
        this.activeStamps.set(stamp.id, cloneStamp(stamp));
      }
    }

    return this.accept(message);
  }

  private applyDisconnect(
    message: Extract<SocialNetworkMessage, { type: 'disconnect' }>,
  ): SocialRuntimeApplyResult {
    const player = this.players.get(message.playerId);

    if (!player) {
      return this.reject(
        createDiagnostic(message, 'invalid-message', 'Remote player is not joined.'),
      );
    }

    this.sequence += 1;
    this.players.set(message.playerId, {
      ...player,
      connected: false,
      lastSeenAtMs: message.sentAtMs,
      stale: true,
      status: 'disconnected',
    });

    return this.accept(message);
  }

  private accept(message: SocialNetworkMessage): Extract<SocialRuntimeApplyResult, { ok: true }> {
    return {
      message,
      ok: true,
      snapshot: this.getSnapshot(),
    };
  }

  private connectedPlayerCount(): number {
    return [...this.players.values()].filter((player) => player.connected).length;
  }

  private getRateLimitDiagnostic(
    message: SocialNetworkMessage,
  ): SocialNetworkDiagnostic | undefined {
    const playerId = 'playerId' in message ? message.playerId : undefined;

    if (typeof playerId !== 'string') {
      return undefined;
    }

    const lowerBound = message.sentAtMs - 1000;
    const previousTimes =
      this.messageTimesByPlayer.get(playerId)?.filter((time) => time > lowerBound) ?? [];

    if (previousTimes.length >= this.limits.messagesPerPlayerPerSecond) {
      this.messageTimesByPlayer.set(playerId, previousTimes);

      return createDiagnostic(message, 'rate-limited', 'Remote player exceeded message rate.');
    }

    this.messageTimesByPlayer.set(playerId, [...previousTimes, message.sentAtMs]);

    return undefined;
  }

  private pruneExpired(nowMs: number): void {
    for (const stamp of this.activeStamps.values()) {
      if (stamp.expiresAtMs <= nowMs) {
        this.activeStamps.delete(stamp.id);
      }
    }
  }

  private reject(
    diagnostic: SocialNetworkDiagnostic,
  ): Extract<SocialRuntimeApplyResult, { ok: false }> {
    this.invalidMessageCount += diagnostic.code === 'invalid-message' ? 1 : 0;
    this.diagnostics = [...this.diagnostics, { ...diagnostic }];

    return {
      diagnostic,
      ok: false,
      snapshot: this.getSnapshot(),
    };
  }
}

function createDiagnostic(
  message: SocialNetworkMessage,
  code: SocialNetworkDiagnostic['code'],
  diagnosticMessage: string,
  playerId = 'playerId' in message ? message.playerId : undefined,
): SocialNetworkDiagnostic {
  return {
    code,
    message: diagnosticMessage,
    messageId: message.messageId,
    ...(playerId ? { playerId } : {}),
    receivedType: message.type,
    dropped: true,
  };
}

function clonePlayer(player: SocialRuntimeRemotePlayer): SocialRuntimeRemotePlayer {
  return {
    ...(player.activeEmoteId ? { activeEmoteId: player.activeEmoteId } : {}),
    avatarId: player.avatarId,
    connected: player.connected,
    displayName: player.displayName,
    lastSeenAtMs: player.lastSeenAtMs,
    playerId: player.playerId,
    ...(player.pose ? { pose: clonePose(player.pose) } : {}),
    sequence: player.sequence,
    stale: player.stale,
    status: player.status,
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

function cloneStamp(stamp: SocialRuntimeStampEvent): SocialRuntimeStampEvent {
  return {
    createdAtMs: stamp.createdAtMs,
    expiresAtMs: stamp.expiresAtMs,
    id: stamp.id,
    playerId: stamp.playerId,
    pose: clonePose(stamp.pose),
    stampId: stamp.stampId,
  };
}
