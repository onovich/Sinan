import { z } from 'zod';

import {
  DisplayNameSchema,
  QuatSchema,
  SchemaVersionSchema,
  StableIdSchema,
  Vec3Schema,
} from '../schemas/common.schema';
import {
  SocialAvatarIdSchema,
  SocialEmoteIdSchema,
  SocialStampIdSchema,
} from '../schemas/social.schema';

export const SocialNetworkMessageIdSchema = StableIdSchema;
export const SocialPlayerIdSchema = StableIdSchema;
export const SocialRoomIdSchema = StableIdSchema;

export const SocialRoomStatusSchema = z.enum(['open', 'full', 'closed', 'fallback']);

export const SocialNetworkErrorCodeSchema = z.enum([
  'invalid-message',
  'unknown-message',
  'unsupported-version',
  'room-full',
  'rate-limited',
  'stale-snapshot',
  'transport-unavailable',
]);

export const SocialNetworkDiagnosticSchema = z
  .object({
    code: SocialNetworkErrorCodeSchema,
    message: z.string().min(1),
    messageId: SocialNetworkMessageIdSchema.optional(),
    playerId: SocialPlayerIdSchema.optional(),
    receivedType: z.string().min(1).optional(),
    dropped: z.boolean().default(true),
  })
  .strict();

export const SocialPoseSchema = z
  .object({
    region: StableIdSchema.optional(),
    position: Vec3Schema,
    rotation: QuatSchema,
    velocity: Vec3Schema.optional(),
    sequence: z.number().int().nonnegative(),
  })
  .strict();

const BaseMessageSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    messageId: SocialNetworkMessageIdSchema,
    sentAtMs: z.number().int().nonnegative(),
  })
  .strict();

export const SocialJoinMessageSchema = BaseMessageSchema.extend({
  type: z.literal('join'),
  roomId: SocialRoomIdSchema,
  playerId: SocialPlayerIdSchema,
  avatarId: SocialAvatarIdSchema,
  displayName: DisplayNameSchema,
});

export const SocialPoseMessageSchema = BaseMessageSchema.extend({
  type: z.literal('pose'),
  playerId: SocialPlayerIdSchema,
  pose: SocialPoseSchema,
});

export const SocialEmoteMessageSchema = BaseMessageSchema.extend({
  type: z.literal('emote'),
  playerId: SocialPlayerIdSchema,
  emoteId: SocialEmoteIdSchema,
  targetPlayerId: SocialPlayerIdSchema.optional(),
});

export const SocialStampMessageSchema = BaseMessageSchema.extend({
  type: z.literal('stamp'),
  playerId: SocialPlayerIdSchema,
  stampId: SocialStampIdSchema,
  pose: SocialPoseSchema,
});

export const SocialSnapshotPlayerSchema = z
  .object({
    playerId: SocialPlayerIdSchema,
    avatarId: SocialAvatarIdSchema,
    displayName: DisplayNameSchema,
    pose: SocialPoseSchema.optional(),
    connected: z.boolean(),
    stale: z.boolean(),
    lastSeenAtMs: z.number().int().nonnegative(),
  })
  .strict();

export const SocialSnapshotStampSchema = z
  .object({
    id: StableIdSchema,
    playerId: SocialPlayerIdSchema,
    stampId: SocialStampIdSchema,
    pose: SocialPoseSchema,
    createdAtMs: z.number().int().nonnegative(),
    expiresAtMs: z.number().int().nonnegative(),
  })
  .strict();

export const SocialSnapshotMessageSchema = BaseMessageSchema.extend({
  type: z.literal('snapshot'),
  room: z
    .object({
      roomId: SocialRoomIdSchema,
      status: SocialRoomStatusSchema,
      maxRemotePlayers: z.number().int().min(1).max(10),
      remotePlayerCount: z.number().int().min(0).max(10),
      rateLimitedPlayerIds: z.array(SocialPlayerIdSchema).default([]),
    })
    .strict(),
  players: z.array(SocialSnapshotPlayerSchema).max(10),
  activeStamps: z.array(SocialSnapshotStampSchema).max(32).default([]),
  diagnostics: z.array(SocialNetworkDiagnosticSchema).default([]),
});

export const SocialDisconnectReasonSchema = z.enum([
  'left',
  'stale',
  'kicked',
  'room-closed',
  'transport-lost',
]);

export const SocialDisconnectMessageSchema = BaseMessageSchema.extend({
  type: z.literal('disconnect'),
  playerId: SocialPlayerIdSchema,
  reason: SocialDisconnectReasonSchema,
});

export const SocialServerTimeMessageSchema = BaseMessageSchema.extend({
  type: z.literal('serverTime'),
  serverTimeMs: z.number().int().nonnegative(),
});

export const SocialErrorMessageSchema = BaseMessageSchema.extend({
  type: z.literal('error'),
  code: SocialNetworkErrorCodeSchema,
  message: z.string().min(1),
  playerId: SocialPlayerIdSchema.optional(),
  relatedMessageId: SocialNetworkMessageIdSchema.optional(),
});

export const SocialNetworkMessageSchema = z.discriminatedUnion('type', [
  SocialJoinMessageSchema,
  SocialPoseMessageSchema,
  SocialEmoteMessageSchema,
  SocialStampMessageSchema,
  SocialSnapshotMessageSchema,
  SocialDisconnectMessageSchema,
  SocialServerTimeMessageSchema,
  SocialErrorMessageSchema,
]);

export const SocialRoomLimitSchema = z
  .object({
    maxRemotePlayers: z.number().int().min(1).max(10),
    messagesPerPlayerPerSecond: z.number().int().min(1).max(60),
    staleAfterMs: z.number().int().min(500).max(60_000),
  })
  .strict();

export type SocialNetworkDiagnostic = z.infer<typeof SocialNetworkDiagnosticSchema>;
export type SocialNetworkMessage = z.infer<typeof SocialNetworkMessageSchema>;
export type SocialPose = z.infer<typeof SocialPoseSchema>;
export type SocialRoomLimit = z.infer<typeof SocialRoomLimitSchema>;

export type SocialNetworkMessageParseResult =
  | {
      ok: true;
      message: SocialNetworkMessage;
    }
  | {
      ok: false;
      diagnostic: SocialNetworkDiagnostic;
    };

export function parseSocialNetworkMessage(input: unknown): SocialNetworkMessageParseResult {
  const result = SocialNetworkMessageSchema.safeParse(input);

  if (result.success) {
    return {
      ok: true,
      message: result.data,
    };
  }

  return {
    ok: false,
    diagnostic: {
      code: getDiagnosticCode(input),
      message: formatZodMessage(result.error.issues),
      messageId: getStringProperty(input, 'messageId'),
      playerId: getStringProperty(input, 'playerId'),
      receivedType: getStringProperty(input, 'type'),
      dropped: true,
    },
  };
}

function getDiagnosticCode(input: unknown): SocialNetworkDiagnostic['code'] {
  const schemaVersion = getNumberProperty(input, 'schemaVersion');

  if (schemaVersion !== undefined && schemaVersion !== 1) {
    return 'unsupported-version';
  }

  const messageType = getStringProperty(input, 'type');

  if (messageType && !knownMessageTypes.has(messageType)) {
    return 'unknown-message';
  }

  return 'invalid-message';
}

function formatZodMessage(issues: readonly { path: PropertyKey[]; message: string }[]): string {
  return issues
    .map((issue) => {
      const path = issue.path.join('.');

      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

function getStringProperty(input: unknown, key: string): string | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  const value = input[key];

  return typeof value === 'string' ? value : undefined;
}

function getNumberProperty(input: unknown, key: string): number | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  const value = input[key];

  return typeof value === 'number' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const knownMessageTypes = new Set([
  'join',
  'pose',
  'emote',
  'stamp',
  'snapshot',
  'disconnect',
  'serverTime',
  'error',
]);
