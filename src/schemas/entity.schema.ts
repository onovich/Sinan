import { z } from 'zod';

import {
  ComponentTypeSchema,
  DisplayNameSchema,
  EntityIdSchema,
  PrefabIdSchema,
} from './common.schema';
import { TransformSchema } from './transform.schema';

export const ComponentPayloadSchema = z.record(z.string(), z.unknown());
export const ComponentMapSchema = z.record(ComponentTypeSchema, ComponentPayloadSchema);

export const EntitySchema = z
  .object({
    id: EntityIdSchema,
    name: DisplayNameSchema.optional(),
    prefab: PrefabIdSchema.optional(),
    transform: TransformSchema,
    components: ComponentMapSchema.default({}),
  })
  .strict();

export type ComponentPayloadData = z.infer<typeof ComponentPayloadSchema>;
export type ComponentMapData = z.infer<typeof ComponentMapSchema>;
export type EntityData = z.infer<typeof EntitySchema>;
