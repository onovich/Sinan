import { z } from 'zod';

import { AssetIdSchema, CameraShotIdSchema, EntityIdSchema, StableIdSchema } from './common.schema';
import {
  MaterialParameterNameSchema,
  MaterialParameterValueSchema,
  MaterialSlotNameSchema,
} from './material.schema';
import { TimelineIdSchema } from './common.schema';
import { TransformSchema } from './transform.schema';

export const ActionValueSchema = z.union([z.boolean(), z.string(), z.number()]);
export const ActionParamsSchema = z.record(z.string(), z.unknown());

export const FlagSetActionSchema = z
  .object({
    type: z.literal('flag.set'),
    flag: StableIdSchema,
    value: ActionValueSchema,
  })
  .strict();

export const FlagToggleActionSchema = z
  .object({
    type: z.literal('flag.toggle'),
    flag: StableIdSchema,
  })
  .strict();

export const EntitySetVisibleActionSchema = z
  .object({
    type: z.literal('entity.setVisible'),
    entityId: EntityIdSchema,
    visible: z.boolean(),
  })
  .strict();

export const EntitySetEnabledActionSchema = z
  .object({
    type: z.literal('entity.setEnabled'),
    entityId: EntityIdSchema,
    enabled: z.boolean(),
  })
  .strict();

export const EntitySetTransformActionSchema = z
  .object({
    type: z.literal('entity.setTransform'),
    entityId: EntityIdSchema,
    transform: TransformSchema,
  })
  .strict();

export const EntityAnimateTransformActionSchema = z
  .object({
    type: z.literal('entity.animateTransform'),
    entityId: EntityIdSchema,
    to: TransformSchema,
    duration: z.number().positive(),
    ease: z.string().min(1).optional(),
  })
  .strict();

export const SwitchSetStateActionSchema = z
  .object({
    type: z.literal('switch.setState'),
    entityId: EntityIdSchema,
    value: z.boolean(),
  })
  .strict();

export const DoorOpenActionSchema = z
  .object({
    type: z.literal('door.open'),
    entityId: EntityIdSchema,
  })
  .strict();

export const DoorCloseActionSchema = DoorOpenActionSchema.extend({
  type: z.literal('door.close'),
}).strict();

export const TimelinePlayActionSchema = z
  .object({
    type: z.literal('timeline.play'),
    timelineId: TimelineIdSchema,
  })
  .strict();

export const TimelineStopActionSchema = TimelinePlayActionSchema.extend({
  type: z.literal('timeline.stop'),
}).strict();

export const CameraPlayShotActionSchema = z
  .object({
    type: z.literal('camera.playShot'),
    shotId: CameraShotIdSchema,
  })
  .strict();

export const AnimationPlayActionSchema = z
  .object({
    type: z.literal('animation.play'),
    entityId: EntityIdSchema,
    clip: z.string().min(1),
    loop: z.boolean().optional(),
    fadeIn: z.number().nonnegative().optional(),
    fadeOut: z.number().nonnegative().optional(),
  })
  .strict();

export const AnimationStopActionSchema = z
  .object({
    type: z.literal('animation.stop'),
    entityId: EntityIdSchema,
    clip: z.string().min(1).optional(),
    fadeOut: z.number().nonnegative().optional(),
  })
  .strict();

export const SoundPlayActionSchema = z
  .object({
    type: z.literal('sound.play'),
    soundId: AssetIdSchema,
  })
  .strict();

export const MaterialSetParameterActionSchema = z
  .object({
    type: z.literal('material.setParameter'),
    entityId: EntityIdSchema,
    slot: MaterialSlotNameSchema,
    parameter: MaterialParameterNameSchema,
    value: MaterialParameterValueSchema,
  })
  .strict();

export const SubtitleShowActionSchema = z
  .object({
    type: z.literal('subtitle.show'),
    text: z.string().min(1),
    duration: z.number().positive(),
    speaker: EntityIdSchema.optional(),
  })
  .strict();

export const FunctionCallActionSchema = z
  .object({
    type: z.literal('function.call'),
    name: StableIdSchema,
    params: ActionParamsSchema.optional(),
  })
  .strict();

export const ActionSchema = z.discriminatedUnion('type', [
  FlagSetActionSchema,
  FlagToggleActionSchema,
  EntitySetVisibleActionSchema,
  EntitySetEnabledActionSchema,
  EntitySetTransformActionSchema,
  EntityAnimateTransformActionSchema,
  SwitchSetStateActionSchema,
  DoorOpenActionSchema,
  DoorCloseActionSchema,
  TimelinePlayActionSchema,
  TimelineStopActionSchema,
  CameraPlayShotActionSchema,
  AnimationPlayActionSchema,
  AnimationStopActionSchema,
  SoundPlayActionSchema,
  MaterialSetParameterActionSchema,
  SubtitleShowActionSchema,
  FunctionCallActionSchema,
]);

export type ActionData = z.infer<typeof ActionSchema>;
