import { z } from 'zod';

import { StableIdSchema } from './common.schema';

export const RenderStyleProfileSchema = z.enum(['standard', 'palette-toon']);

export const RenderStyleVisibilityModeSchema = z.enum([
  'none',
  'selected',
  'interactable',
  'always',
]);

export const RenderStyleFeatureModeSchema = z.enum(['inherit', 'enabled', 'disabled']);

export const RenderStyleSchema = z
  .object({
    profile: RenderStyleProfileSchema.default('standard'),
    palette: StableIdSchema.optional(),
    tone: StableIdSchema.optional(),
    outline: RenderStyleVisibilityModeSchema.optional(),
    highlight: RenderStyleVisibilityModeSchema.optional(),
    fog: RenderStyleFeatureModeSchema.optional(),
    colorGrade: RenderStyleFeatureModeSchema.optional(),
  })
  .strict();

export type RenderStyleProfile = z.infer<typeof RenderStyleProfileSchema>;
export type RenderStyleVisibilityMode = z.infer<typeof RenderStyleVisibilityModeSchema>;
export type RenderStyleFeatureMode = z.infer<typeof RenderStyleFeatureModeSchema>;
export type RenderStyleData = z.infer<typeof RenderStyleSchema>;
