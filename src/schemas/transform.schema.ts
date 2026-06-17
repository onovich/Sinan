import { z } from 'zod';

import { QuatSchema, Vec3Schema } from './common.schema';

export const TransformSchema = z
  .object({
    position: Vec3Schema,
    rotation: QuatSchema,
    scale: Vec3Schema,
  })
  .strict();

export type TransformData = z.infer<typeof TransformSchema>;
