import { z } from 'zod';

import { EntityIdSchema, EventIdSchema, StableIdSchema, TimelineIdSchema } from './common.schema';

export const EntityInteractTriggerSchema = z
  .object({
    type: z.literal('entity.interact'),
    entityId: EntityIdSchema,
  })
  .strict();

export const TriggerEnterSchema = z
  .object({
    type: z.literal('trigger.enter'),
    triggerId: EntityIdSchema,
    entityId: EntityIdSchema.optional(),
  })
  .strict();

export const TriggerExitSchema = TriggerEnterSchema.extend({
  type: z.literal('trigger.exit'),
}).strict();

export const LevelStartTriggerSchema = z
  .object({
    type: z.literal('level.start'),
  })
  .strict();

export const TimelineFinishedTriggerSchema = z
  .object({
    type: z.literal('timeline.finished'),
    timelineId: TimelineIdSchema,
  })
  .strict();

export const ActionCompletedTriggerSchema = z
  .object({
    type: z.literal('action.completed'),
    actionId: StableIdSchema,
  })
  .strict();

export const FlagChangedTriggerSchema = z
  .object({
    type: z.literal('flag.changed'),
    flag: StableIdSchema,
  })
  .strict();

export const TriggerSchema = z.discriminatedUnion('type', [
  EntityInteractTriggerSchema,
  TriggerEnterSchema,
  TriggerExitSchema,
  LevelStartTriggerSchema,
  TimelineFinishedTriggerSchema,
  ActionCompletedTriggerSchema,
  FlagChangedTriggerSchema,
]);

export type TriggerData = z.infer<typeof TriggerSchema>;

export const TriggeredEventIdSchema = EventIdSchema;
