import type { Vec3 } from '../../schemas/common.schema';
import type {
  SocialAvatarData,
  SocialEmoteData,
  SocialPresetData,
  SocialStampData,
} from '../../schemas/social.schema';
import type { WorldProjectionData } from '../../schemas/worldProjection.schema';
import { type SocialNetworkMessage, type SocialPose } from '../../network/socialMessages';
import { projectSphericalRegion } from '../../world/CubeSphereProjection';

export interface SocialSimulatorDiagnostic {
  code: 'invalid-fixture' | 'missing-region';
  message: string;
  path: string;
}

export interface SocialRemotePlayerSimulatorOptions {
  avatars: readonly SocialAvatarData[];
  emotes: readonly SocialEmoteData[];
  lowEndProfile?: boolean;
  preset: SocialPresetData;
  roomId?: string;
  seed?: number;
  stamps: readonly SocialStampData[];
  startAtMs?: number;
  worldProjection?: WorldProjectionData;
}

export interface SocialRemotePlayerSimulatorStep {
  diagnostics: SocialSimulatorDiagnostic[];
  messages: SocialNetworkMessage[];
  nowMs: number;
  remoteCount: number;
  tick: number;
}

const roundScale = 1_000_000;

export class SocialRemotePlayerSimulator {
  private readonly diagnostics: SocialSimulatorDiagnostic[];
  private readonly remotes: SocialPresetData['remotes'];
  private readonly roomId: string;
  private nowMs: number;
  private tick = 0;

  constructor(private readonly options: SocialRemotePlayerSimulatorOptions) {
    this.roomId = options.roomId ?? 'room.showcase';
    this.nowMs = options.startAtMs ?? 0;
    this.remotes = options.preset.remotes
      .filter((remote) => !options.lowEndProfile || remote.lowEndVisible)
      .slice(0, options.preset.maxRemotePlayers);
    this.diagnostics = validateSocialSimulatorFixture(options);
  }

  createJoinMessages(): SocialNetworkMessage[] {
    if (this.diagnostics.length > 0) {
      return [];
    }

    return this.remotes.map((remote, index) => ({
      schemaVersion: 1,
      messageId: createMessageId('join', remote.id, 0),
      sentAtMs: this.nowMs + index,
      type: 'join',
      roomId: this.roomId,
      playerId: remote.id,
      avatarId: remote.avatarId,
      displayName: remote.displayName,
    }));
  }

  getDiagnostics(): SocialSimulatorDiagnostic[] {
    return this.diagnostics.map((diagnostic) => ({ ...diagnostic }));
  }

  getRemoteCount(): number {
    return this.remotes.length;
  }

  reset(nowMs = this.options.startAtMs ?? 0): SocialRemotePlayerSimulatorStep {
    this.tick = 0;
    this.nowMs = nowMs;

    return {
      diagnostics: this.getDiagnostics(),
      messages: this.createJoinMessages(),
      nowMs: this.nowMs,
      remoteCount: this.getRemoteCount(),
      tick: this.tick,
    };
  }

  step(deltaMs: number): SocialRemotePlayerSimulatorStep {
    this.nowMs += Math.max(0, Math.round(deltaMs));
    this.tick += 1;

    if (this.diagnostics.length > 0) {
      return {
        diagnostics: this.getDiagnostics(),
        messages: [],
        nowMs: this.nowMs,
        remoteCount: this.getRemoteCount(),
        tick: this.tick,
      };
    }

    const messages: SocialNetworkMessage[] = [];

    this.remotes.forEach((remote, index) => {
      const pose = createRemotePose({
        index,
        seed: this.options.seed ?? 0,
        tick: this.tick,
        worldProjection: this.options.worldProjection,
        regionId: remote.spawnRegion,
      });

      messages.push({
        schemaVersion: 1,
        messageId: createMessageId('pose', remote.id, this.tick),
        sentAtMs: this.nowMs + index,
        type: 'pose',
        playerId: remote.id,
        pose,
      });

      if (remote.initialEmoteId && this.tick % 3 === 0) {
        messages.push({
          schemaVersion: 1,
          messageId: createMessageId('emote', remote.id, this.tick),
          sentAtMs: this.nowMs + index + 100,
          type: 'emote',
          playerId: remote.id,
          emoteId: remote.initialEmoteId,
        });
      }

      if (remote.initialStampId && this.tick % 4 === 0) {
        messages.push({
          schemaVersion: 1,
          messageId: createMessageId('stamp', remote.id, this.tick),
          sentAtMs: this.nowMs + index + 200,
          type: 'stamp',
          playerId: remote.id,
          stampId: remote.initialStampId,
          pose,
        });
      }
    });

    return {
      diagnostics: [],
      messages,
      nowMs: this.nowMs,
      remoteCount: this.getRemoteCount(),
      tick: this.tick,
    };
  }
}

export function validateSocialSimulatorFixture(
  options: SocialRemotePlayerSimulatorOptions,
): SocialSimulatorDiagnostic[] {
  const avatarIds = new Set(options.avatars.map((avatar) => avatar.id));
  const emoteIds = new Set(options.emotes.map((emote) => emote.id));
  const stampIds = new Set(options.stamps.map((stamp) => stamp.id));
  const diagnostics: SocialSimulatorDiagnostic[] = [];

  if (options.preset.remotes.length > options.preset.maxRemotePlayers) {
    diagnostics.push({
      code: 'invalid-fixture',
      path: `data/social/presets.json.${options.preset.id}.remotes`,
      message: `Preset has ${options.preset.remotes.length} remotes but maxRemotePlayers is ${options.preset.maxRemotePlayers}.`,
    });
  }

  options.preset.remotes.forEach((remote, index) => {
    const path = `data/social/presets.json.${options.preset.id}.remotes.${index}`;

    if (!avatarIds.has(remote.avatarId)) {
      diagnostics.push({
        code: 'invalid-fixture',
        path: `${path}.avatarId`,
        message: `Missing social avatar "${remote.avatarId}".`,
      });
    }

    if (remote.initialEmoteId && !emoteIds.has(remote.initialEmoteId)) {
      diagnostics.push({
        code: 'invalid-fixture',
        path: `${path}.initialEmoteId`,
        message: `Missing social emote "${remote.initialEmoteId}".`,
      });
    }

    if (remote.initialStampId && !stampIds.has(remote.initialStampId)) {
      diagnostics.push({
        code: 'invalid-fixture',
        path: `${path}.initialStampId`,
        message: `Missing social stamp "${remote.initialStampId}".`,
      });
    }

    if (remote.spawnRegion && options.worldProjection) {
      const region = options.worldProjection.regions.find(
        (candidate) => candidate.id === remote.spawnRegion,
      );

      if (!region) {
        diagnostics.push({
          code: 'missing-region',
          path: `${path}.spawnRegion`,
          message: `Missing spherical spawn region "${remote.spawnRegion}".`,
        });
      }
    }
  });

  return diagnostics;
}

function createRemotePose(input: {
  index: number;
  regionId?: string;
  seed: number;
  tick: number;
  worldProjection?: WorldProjectionData;
}): SocialPose {
  const regionId = input.regionId ?? 'default';
  const angle = input.seed * 0.17 + input.index * 0.73 + input.tick * 0.11;
  const localPosition: Vec3 = [
    roundNumber(Math.sin(angle) * 0.9),
    0.08,
    roundNumber(Math.cos(angle) * 0.9),
  ];
  const yaw = wrapRadians(angle + Math.PI / 2);
  const surfaceRotation = resolveSurfaceRotation(
    input.worldProjection,
    regionId,
    localPosition,
    yaw,
  );

  return {
    region: regionId,
    position: localPosition,
    rotation: surfaceRotation ?? yawToQuat(yaw),
    sequence: input.tick,
  };
}

function resolveSurfaceRotation(
  worldProjection: WorldProjectionData | undefined,
  regionId: string,
  localPosition: Vec3,
  yaw: number,
): SocialPose['rotation'] | undefined {
  const region = worldProjection?.regions.find((candidate) => candidate.id === regionId);

  if (!worldProjection || !region) {
    return undefined;
  }

  return projectSphericalRegion({
    localPosition,
    localYaw: yaw,
    radius: worldProjection.radius,
    region,
  }).rotation;
}

function createMessageId(kind: string, remoteId: string, tick: number): string {
  return `sim.${kind}.${remoteId}.${tick}`;
}

function yawToQuat(yaw: number): SocialPose['rotation'] {
  const half = yaw / 2;

  return [0, roundNumber(Math.sin(half)), 0, roundNumber(Math.cos(half))];
}

function wrapRadians(value: number): number {
  const tau = Math.PI * 2;
  const wrapped = ((((value + Math.PI) % tau) + tau) % tau) - Math.PI;

  return Object.is(wrapped, -0) ? 0 : roundNumber(wrapped);
}

function roundNumber(value: number): number {
  const rounded = Math.round(value * roundScale) / roundScale;

  return Object.is(rounded, -0) ? 0 : rounded;
}
