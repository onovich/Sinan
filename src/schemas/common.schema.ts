import { z } from 'zod';

export const SchemaVersionSchema = z.literal(1);

export const StableIdSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/, 'Use a stable id without spaces.');

export const EntityIdSchema = StableIdSchema;
export const PrefabIdSchema = StableIdSchema;
export const TimelineIdSchema = StableIdSchema;
export const CameraShotIdSchema = StableIdSchema;
export const AssetIdSchema = StableIdSchema;
export const EventIdSchema = StableIdSchema;
export const ComponentTypeSchema = StableIdSchema;

export const DisplayNameSchema = z.string().min(1).max(120);
export const HexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Expected a hex color.');

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export const QuatSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export type EntityId = z.infer<typeof EntityIdSchema>;
export type PrefabId = z.infer<typeof PrefabIdSchema>;
export type TimelineId = z.infer<typeof TimelineIdSchema>;
export type CameraShotId = z.infer<typeof CameraShotIdSchema>;
export type AssetId = z.infer<typeof AssetIdSchema>;
export type EventId = z.infer<typeof EventIdSchema>;
export type ComponentType = z.infer<typeof ComponentTypeSchema>;
export type Vec3 = z.infer<typeof Vec3Schema>;
export type Quat = z.infer<typeof QuatSchema>;
