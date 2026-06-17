import { z } from 'zod';

import { Vec3Schema } from './common.schema';

export const AabbColliderComponentSchema = z
  .object({
    shape: z.literal('aabb'),
    center: Vec3Schema.default([0, 0, 0]),
    size: Vec3Schema,
    isTrigger: z.boolean().optional(),
    debugColor: z.string().min(1).optional(),
  })
  .strict();

export const TriggerZoneComponentSchema = z
  .object({
    enabled: z.boolean().default(true),
  })
  .strict();

export type AabbColliderComponentData = z.infer<typeof AabbColliderComponentSchema>;
export type TriggerZoneComponentData = z.infer<typeof TriggerZoneComponentSchema>;
