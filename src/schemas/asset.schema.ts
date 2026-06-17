import { z } from 'zod';

import { AssetIdSchema, SchemaVersionSchema } from './common.schema';

export const AssetTypeSchema = z.enum([
  'model',
  'audio',
  'texture',
  'image',
  'material',
  'font',
  'data',
]);

export const AssetEntrySchema = z
  .object({
    type: AssetTypeSchema,
    url: z.string().min(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const AssetManifestSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    assets: z.record(AssetIdSchema, AssetEntrySchema),
  })
  .strict();

export type AssetType = z.infer<typeof AssetTypeSchema>;
export type AssetEntryData = z.infer<typeof AssetEntrySchema>;
export type AssetManifestData = z.infer<typeof AssetManifestSchema>;
