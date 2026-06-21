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

export const AssetCategorySchema = z.enum([
  'environment',
  'prop',
  'character',
  'marker',
  'audio',
  'texture',
  'ui',
  'material',
  'data',
]);

export const AssetCompressionCodecSchema = z.enum(['none', 'draco', 'meshopt', 'ktx2', 'basisu']);

export const AssetCompressionStatusSchema = z.enum([
  'source',
  'pending',
  'ready',
  'required',
  'compressed',
  'unsupported',
  'unknown',
]);

export const AssetInstancingHintSchema = z.enum(['none', 'eligible', 'required']);

export const AssetLodStrategySchema = z.enum(['distance']);

export const AssetLodLevelSchema = z
  .object({
    level: z.number().int().nonnegative(),
    asset: AssetIdSchema,
    minDistance: z.number().finite().nonnegative(),
  })
  .strict();

const MAX_LOW_END_LOD_BIAS = 4;

export const AssetLodGroupSchema = z
  .object({
    strategy: AssetLodStrategySchema,
    hysteresis: z.number().finite().nonnegative(),
    lowEndBias: z.number().int().min(0).max(MAX_LOW_END_LOD_BIAS),
    fallbackAsset: AssetIdSchema,
    levels: z.array(AssetLodLevelSchema).min(1),
  })
  .strict()
  .superRefine((group, context) => {
    const seenLevels = new Set<number>();
    let previousLevel = -1;
    let previousMinDistance = -Infinity;

    group.levels.forEach((level, index) => {
      if (seenLevels.has(level.level)) {
        context.addIssue({
          code: 'custom',
          path: ['levels', index, 'level'],
          message: `Duplicate LOD level "${level.level}".`,
        });
      }
      seenLevels.add(level.level);

      if (level.level <= previousLevel) {
        context.addIssue({
          code: 'custom',
          path: ['levels', index, 'level'],
          message: 'LOD levels must be ordered by ascending level.',
        });
      }

      if (level.minDistance <= previousMinDistance) {
        context.addIssue({
          code: 'custom',
          path: ['levels', index, 'minDistance'],
          message: 'LOD minDistance thresholds must increase.',
        });
      }

      previousLevel = level.level;
      previousMinDistance = level.minDistance;
    });

    if (group.levels[0]?.level !== 0) {
      context.addIssue({
        code: 'custom',
        path: ['levels', 0, 'level'],
        message: 'LOD groups must start at level 0.',
      });
    }

    if (group.levels[0]?.minDistance !== 0) {
      context.addIssue({
        code: 'custom',
        path: ['levels', 0, 'minDistance'],
        message: 'LOD groups must start at minDistance 0.',
      });
    }

    if (group.lowEndBias >= group.levels.length) {
      context.addIssue({
        code: 'custom',
        path: ['lowEndBias'],
        message: 'lowEndBias must be lower than the number of LOD levels.',
      });
    }

    if (!group.levels.some((level) => level.asset === group.fallbackAsset)) {
      context.addIssue({
        code: 'custom',
        path: ['fallbackAsset'],
        message: 'fallbackAsset must reference one of the LOD levels.',
      });
    }
  });

export const AssetTextureColorSpaceSchema = z.enum(['srgb', 'linear', 'none']);

export const AssetTextureUsageSchema = z.enum([
  'color',
  'emissive',
  'normal',
  'metallicRoughness',
  'occlusion',
  'mask',
  'noise',
  'data',
]);

export const AssetTextureCompressionCodecSchema = z.enum(['none', 'ktx2', 'basisu']);

export const AssetCompressionMetadataSchema = z
  .object({
    codec: AssetCompressionCodecSchema,
    status: AssetCompressionStatusSchema.optional(),
    decoder: AssetCompressionCodecSchema.optional(),
    sourceUrl: z.string().min(1).optional(),
  })
  .strict();

export const AssetTextureCompressionMetadataSchema = z
  .object({
    codec: AssetTextureCompressionCodecSchema,
    status: AssetCompressionStatusSchema.optional(),
    sourceUrl: z.string().min(1).optional(),
  })
  .strict();

export const AssetSourceMetadataSchema = z
  .object({
    file: z.string().min(1).optional(),
    authoringTool: z.string().min(1).optional(),
    generated: z.boolean().optional(),
    license: z.string().min(1).optional(),
  })
  .strict();

export const AssetMetadataSchema = z
  .object({
    category: AssetCategorySchema.optional(),
    materialProfile: z.string().min(1).optional(),
    maxTriangles: z.number().int().nonnegative().optional(),
    textureBudgetKb: z.number().int().nonnegative().optional(),
    sizeBudgetBytes: z.number().int().nonnegative().optional(),
    textureUsage: AssetTextureUsageSchema.optional(),
    colorSpace: AssetTextureColorSpaceSchema.optional(),
    compressed: z.boolean().optional(),
    compression: AssetCompressionMetadataSchema.optional(),
    textureCompression: AssetTextureCompressionMetadataSchema.optional(),
    lodGroup: z.string().min(1).optional(),
    instancing: AssetInstancingHintSchema.optional(),
    notes: z.string().min(1).optional(),
    clips: z
      .array(z.string().min(1))
      .refine((clips) => new Set(clips).size === clips.length, 'Animation clips must be unique.')
      .optional(),
    source: AssetSourceMetadataSchema.optional(),
    extras: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .superRefine((metadata, context) => {
    if (!metadata.textureUsage || !metadata.colorSpace) {
      return;
    }

    if (metadata.textureUsage === 'color' || metadata.textureUsage === 'emissive') {
      if (metadata.colorSpace !== 'srgb') {
        context.addIssue({
          code: 'custom',
          path: ['colorSpace'],
          message: 'Color and emissive textures must use srgb colorSpace.',
        });
      }
      return;
    }

    if (metadata.colorSpace === 'srgb') {
      context.addIssue({
        code: 'custom',
        path: ['colorSpace'],
        message: 'Data textures must not use srgb colorSpace.',
      });
    }
  });

export const AssetEntrySchema = z
  .object({
    type: AssetTypeSchema,
    url: z.string().min(1),
    metadata: AssetMetadataSchema.optional(),
  })
  .strict();

export const AssetManifestSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    assets: z.record(AssetIdSchema, AssetEntrySchema),
    lodGroups: z.record(AssetIdSchema, AssetLodGroupSchema).optional(),
  })
  .strict();

export type AssetType = z.infer<typeof AssetTypeSchema>;
export type AssetLodStrategyData = z.infer<typeof AssetLodStrategySchema>;
export type AssetLodLevelData = z.infer<typeof AssetLodLevelSchema>;
export type AssetLodGroupData = z.infer<typeof AssetLodGroupSchema>;
export type AssetMetadataData = z.infer<typeof AssetMetadataSchema>;
export type AssetEntryData = z.infer<typeof AssetEntrySchema>;
export type AssetManifestData = z.infer<typeof AssetManifestSchema>;
