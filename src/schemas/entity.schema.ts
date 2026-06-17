import { z } from 'zod';

import { DisplayNameSchema, EntityIdSchema, PrefabIdSchema } from './common.schema';
import {
  ComponentMapSchema,
  ComponentPayloadSchema,
  type ComponentMapData,
  type ComponentPayloadData,
} from './component.schema';
import { TransformSchema } from './transform.schema';

export const EntitySchema = z
  .object({
    id: EntityIdSchema,
    name: DisplayNameSchema.optional(),
    prefab: PrefabIdSchema.optional(),
    transform: TransformSchema,
    components: ComponentMapSchema.default({}),
  })
  .strict();

export { ComponentMapSchema, ComponentPayloadSchema };
export type { ComponentMapData, ComponentPayloadData };
export type EntityData = z.infer<typeof EntitySchema>;
