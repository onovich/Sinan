import { z } from 'zod';

import { DisplayNameSchema, HexColorSchema, StableIdSchema, Vec3Schema } from './common.schema';

export const WorldProjectionFaceSchema = z.enum([
  'front',
  'back',
  'left',
  'right',
  'top',
  'bottom',
]);

const PositiveVec3Schema = z.tuple([
  z.number().finite().positive(),
  z.number().finite().positive(),
  z.number().finite().positive(),
]);

export const SphericalRegionLocalBoundsSchema = z
  .object({
    center: Vec3Schema,
    size: PositiveVec3Schema,
  })
  .strict();

export const SphericalRegionStyleSchema = z
  .object({
    color: HexColorSchema.optional(),
    tone: StableIdSchema.optional(),
  })
  .strict();

export const SphericalRegionSchema = z
  .object({
    id: StableIdSchema,
    name: DisplayNameSchema,
    label: DisplayNameSchema,
    face: WorldProjectionFaceSchema,
    localBounds: SphericalRegionLocalBoundsSchema,
    style: SphericalRegionStyleSchema.optional(),
    lodGroup: StableIdSchema.optional(),
    scatterGroup: StableIdSchema.optional(),
  })
  .strict();

export const WorldProjectionSchema = z
  .object({
    type: z.literal('cube-sphere'),
    radius: z.number().finite().positive(),
    regions: z.array(SphericalRegionSchema).min(1),
  })
  .strict()
  .superRefine((projection, context) => {
    const seen = new Set<string>();

    projection.regions.forEach((region, index) => {
      if (seen.has(region.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate region id "${region.id}".`,
          path: ['regions', index, 'id'],
        });
      }
      seen.add(region.id);
    });
  });

export const SphericalRegionPlacementSchema = z
  .object({
    mode: z.literal('spherical-region'),
    region: StableIdSchema,
    localPosition: Vec3Schema.optional(),
    localYaw: z.number().finite().optional(),
  })
  .strict();

export const EntityPlacementSchema = z.discriminatedUnion('mode', [SphericalRegionPlacementSchema]);

export type WorldProjectionFaceData = z.infer<typeof WorldProjectionFaceSchema>;
export type SphericalRegionLocalBoundsData = z.infer<typeof SphericalRegionLocalBoundsSchema>;
export type SphericalRegionStyleData = z.infer<typeof SphericalRegionStyleSchema>;
export type SphericalRegionData = z.infer<typeof SphericalRegionSchema>;
export type WorldProjectionData = z.infer<typeof WorldProjectionSchema>;
export type SphericalRegionPlacementData = z.infer<typeof SphericalRegionPlacementSchema>;
export type EntityPlacementData = z.infer<typeof EntityPlacementSchema>;
