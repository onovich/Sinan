import { z } from 'zod';

import { ActionSchema } from './action.schema';
import { ConditionSchema } from './condition.schema';
import { DisplayNameSchema, EventIdSchema, SchemaVersionSchema } from './common.schema';
import { TriggerSchema } from './trigger.schema';

export const EventSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: EventIdSchema,
    name: DisplayNameSchema.optional(),
    trigger: TriggerSchema,
    condition: ConditionSchema.optional(),
    actions: z.array(ActionSchema).min(1),
  })
  .strict();

export type EventData = z.infer<typeof EventSchema>;
