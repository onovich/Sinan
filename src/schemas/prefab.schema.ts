import { z } from 'zod';

import {
  AssetIdSchema,
  DisplayNameSchema,
  PrefabIdSchema,
  SchemaVersionSchema,
} from './common.schema';
import { ComponentMapSchema } from './entity.schema';
import { TransformSchema } from './transform.schema';

export const PrefabSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: PrefabIdSchema,
    name: DisplayNameSchema,
    model: AssetIdSchema.optional(),
    defaultTransform: TransformSchema,
    components: ComponentMapSchema.default({}),
  })
  .strict();

export type PrefabData = z.infer<typeof PrefabSchema>;
