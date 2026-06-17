import { z } from 'zod';

import { EntityIdSchema, StableIdSchema } from './common.schema';

export const ConditionValueSchema = z.union([z.boolean(), z.string(), z.number()]);
export const ConditionParamsSchema = z.record(z.string(), z.unknown());

export const FlagEqualsConditionSchema = z
  .object({
    type: z.literal('flag.equals'),
    flag: StableIdSchema,
    value: ConditionValueSchema,
  })
  .strict();

export const FlagExistsConditionSchema = z
  .object({
    type: z.literal('flag.exists'),
    flag: StableIdSchema,
  })
  .strict();

export const InventoryHasItemConditionSchema = z
  .object({
    type: z.literal('inventory.hasItem'),
    itemId: StableIdSchema,
  })
  .strict();

export const QuestStateEqualsConditionSchema = z
  .object({
    type: z.literal('quest.stateEquals'),
    questId: StableIdSchema,
    state: z.string().min(1),
  })
  .strict();

export const EntityStateEqualsConditionSchema = z
  .object({
    type: z.literal('entity.stateEquals'),
    entityId: EntityIdSchema,
    state: z.string().min(1),
    value: ConditionValueSchema,
  })
  .strict();

export const DistanceLessThanConditionSchema = z
  .object({
    type: z.literal('distance.lessThan'),
    entityA: EntityIdSchema,
    entityB: EntityIdSchema,
    distance: z.number().nonnegative(),
  })
  .strict();

export const CustomConditionSchema = z
  .object({
    type: z.literal('custom.condition'),
    name: StableIdSchema,
    params: ConditionParamsSchema.optional(),
  })
  .strict();

export type ConditionData =
  | { all: ConditionData[] }
  | { any: ConditionData[] }
  | { not: ConditionData }
  | z.infer<typeof FlagEqualsConditionSchema>
  | z.infer<typeof FlagExistsConditionSchema>
  | z.infer<typeof InventoryHasItemConditionSchema>
  | z.infer<typeof QuestStateEqualsConditionSchema>
  | z.infer<typeof EntityStateEqualsConditionSchema>
  | z.infer<typeof DistanceLessThanConditionSchema>
  | z.infer<typeof CustomConditionSchema>;

export const ConditionSchema: z.ZodType<ConditionData> = z.lazy(() =>
  z.union([
    z
      .object({
        all: z.array(ConditionSchema).min(1),
      })
      .strict(),
    z
      .object({
        any: z.array(ConditionSchema).min(1),
      })
      .strict(),
    z
      .object({
        not: ConditionSchema,
      })
      .strict(),
    FlagEqualsConditionSchema,
    FlagExistsConditionSchema,
    InventoryHasItemConditionSchema,
    QuestStateEqualsConditionSchema,
    EntityStateEqualsConditionSchema,
    DistanceLessThanConditionSchema,
    CustomConditionSchema,
  ]),
);
