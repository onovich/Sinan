import { z } from 'zod';

import {
  AssetIdSchema,
  DisplayNameSchema,
  HexColorSchema,
  SchemaVersionSchema,
  StableIdSchema,
} from './common.schema';

export const SocialAvatarIdSchema = StableIdSchema;
export const SocialEmoteIdSchema = StableIdSchema;
export const SocialStampIdSchema = StableIdSchema;
export const SocialPresetIdSchema = StableIdSchema;

const SocialLabelSchema = z.string().min(1).max(32);
const SocialShortLabelSchema = z.string().min(1).max(4);

export const SocialLowEndBehaviorSchema = z.enum(['visible', 'badge-only', 'hidden']);

export const SocialAvatarSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: SocialAvatarIdSchema,
    displayName: DisplayNameSchema,
    shortLabel: SocialShortLabelSchema,
    bodyColor: HexColorSchema,
    accentColor: HexColorSchema,
    modelAssetId: AssetIdSchema.optional(),
    fixtureScale: z.number().min(0.25).max(4).default(1),
    lowEndBehavior: SocialLowEndBehaviorSchema.default('visible'),
  })
  .strict();

export const SocialEmoteSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: SocialEmoteIdSchema,
    label: SocialLabelSchema,
    iconToken: z.enum(['wave', 'spark', 'check', 'question', 'heart']),
    durationMs: z.number().int().min(250).max(10_000),
    cooldownMs: z.number().int().min(0).max(60_000),
    color: HexColorSchema,
    fallbackLabel: SocialLabelSchema,
  })
  .strict();

export const SocialStampSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: SocialStampIdSchema,
    emoteId: SocialEmoteIdSchema,
    label: SocialLabelSchema,
    lifetimeMs: z.number().int().min(250).max(15_000),
    radius: z.number().min(0.1).max(8),
    height: z.number().min(0).max(8),
    color: HexColorSchema,
    priority: z.number().int().min(0).max(10),
    lowEndBehavior: SocialLowEndBehaviorSchema.default('badge-only'),
  })
  .strict();

export const SocialPresetRemoteSchema = z
  .object({
    id: StableIdSchema,
    avatarId: SocialAvatarIdSchema,
    displayName: DisplayNameSchema,
    initialEmoteId: SocialEmoteIdSchema.optional(),
    initialStampId: SocialStampIdSchema.optional(),
    spawnRegion: StableIdSchema.optional(),
    lowEndVisible: z.boolean().default(true),
  })
  .strict();

export const SocialPresetSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: SocialPresetIdSchema,
    label: SocialLabelSchema,
    maxRemotePlayers: z.number().int().min(1).max(10),
    remotes: z.array(SocialPresetRemoteSchema).min(1).max(10),
  })
  .strict();

export type SocialAvatarData = z.infer<typeof SocialAvatarSchema>;
export type SocialEmoteData = z.infer<typeof SocialEmoteSchema>;
export type SocialStampData = z.infer<typeof SocialStampSchema>;
export type SocialPresetData = z.infer<typeof SocialPresetSchema>;
