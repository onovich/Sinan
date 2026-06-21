import { z } from 'zod';

import { AssetIdSchema, PrefabIdSchema, StableIdSchema, Vec3Schema } from './common.schema';

export const ScatterSourceSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('asset'),
      asset: AssetIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('prefab'),
      prefab: PrefabIdSchema,
    })
    .strict(),
]);

export const ScatterRangeSchema = z
  .object({
    min: z.number().finite(),
    max: z.number().finite(),
  })
  .strict()
  .superRefine((range, context) => {
    if (range.max < range.min) {
      context.addIssue({
        code: 'custom',
        path: ['max'],
        message: 'Scatter range max must be greater than or equal to min.',
      });
    }
  });

const NonnegativeVec3Schema = z.tuple([
  z.number().finite().nonnegative(),
  z.number().finite().nonnegative(),
  z.number().finite().nonnegative(),
]);

export const ScatterPlacementSchema = z
  .object({
    shape: z.literal('box'),
    center: Vec3Schema,
    size: NonnegativeVec3Schema,
  })
  .strict();

export const ScatterTransformRangesSchema = z
  .object({
    yaw: ScatterRangeSchema.optional(),
    uniformScale: ScatterRangeSchema.optional(),
  })
  .strict()
  .superRefine((ranges, context) => {
    if (ranges.uniformScale && ranges.uniformScale.min <= 0) {
      context.addIssue({
        code: 'custom',
        path: ['uniformScale', 'min'],
        message: 'Scatter uniformScale min must be greater than 0.',
      });
    }
  });

export const ScatterAlignmentSchema = z.enum(['none', 'y-up']);

export const ScatterQualitySchema = z
  .object({
    lodGroup: StableIdSchema.optional(),
    lowEndCountScale: z.number().finite().min(0).max(1).optional(),
  })
  .strict();

export const ScatterFallbackSchema = z
  .object({
    mode: z.enum(['skip', 'placeholder']),
    asset: AssetIdSchema.optional(),
  })
  .strict();

export const ScatterGroupSchema = z
  .object({
    id: StableIdSchema,
    source: ScatterSourceSchema,
    count: z.number().int().min(0).max(10_000),
    seed: z.union([z.string().min(1), z.number().int()]),
    placement: ScatterPlacementSchema,
    alignment: ScatterAlignmentSchema.default('y-up'),
    transform: ScatterTransformRangesSchema.optional(),
    quality: ScatterQualitySchema.optional(),
    fallback: ScatterFallbackSchema.optional(),
  })
  .strict();

export type ScatterSourceData = z.infer<typeof ScatterSourceSchema>;
export type ScatterRangeData = z.infer<typeof ScatterRangeSchema>;
export type ScatterGroupData = z.infer<typeof ScatterGroupSchema>;
