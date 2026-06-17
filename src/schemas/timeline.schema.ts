import { z } from 'zod';

import { ActionSchema } from './action.schema';
import {
  AssetIdSchema,
  CameraShotIdSchema,
  DisplayNameSchema,
  EntityIdSchema,
  SchemaVersionSchema,
  StableIdSchema,
  TimelineIdSchema,
  Vec3Schema,
} from './common.schema';

const TrackIdSchema = StableIdSchema;
const TimelineTimeSchema = z.number().nonnegative();
const TimelineDurationSchema = z.number().positive();
const EaseSchema = z.string().min(1).optional();
const PropertyValueSchema = z.union([z.boolean(), z.number(), z.string(), Vec3Schema]);

export const TimelineSettingsSchema = z
  .object({
    skippable: z.boolean().optional(),
    lockPlayerControl: z.boolean().optional(),
    restoreCameraOnFinish: z.boolean().optional(),
  })
  .strict();

export const ActionTimelineTrackSchema = z
  .object({
    id: TrackIdSchema,
    type: z.literal('action'),
    time: TimelineTimeSchema,
    action: ActionSchema,
  })
  .strict();

export const AnimationPlayTimelineTrackSchema = z
  .object({
    id: TrackIdSchema,
    type: z.literal('animation.play'),
    start: TimelineTimeSchema,
    entityId: EntityIdSchema,
    clip: z.string().min(1),
    loop: z.boolean().optional(),
    fadeIn: z.number().nonnegative().optional(),
    fadeOut: z.number().nonnegative().optional(),
  })
  .strict();

export const CameraShotTimelineTrackSchema = z
  .object({
    id: TrackIdSchema,
    type: z.literal('camera.shot'),
    start: TimelineTimeSchema,
    duration: TimelineDurationSchema,
    shotId: CameraShotIdSchema,
    blendIn: z.number().nonnegative().optional(),
    blendOut: z.number().nonnegative().optional(),
  })
  .strict();

export const PropertyTimelineKeySchema = z
  .object({
    time: TimelineTimeSchema,
    value: PropertyValueSchema,
    ease: EaseSchema,
  })
  .strict();

export const PropertyTimelineTrackSchema = z
  .object({
    id: TrackIdSchema,
    type: z.literal('property'),
    target: EntityIdSchema,
    property: z.string().min(1),
    keys: z.array(PropertyTimelineKeySchema).min(1),
  })
  .strict();

export const WaitTimelineTrackSchema = z
  .object({
    id: TrackIdSchema,
    type: z.literal('wait'),
    start: TimelineTimeSchema,
    duration: TimelineDurationSchema,
  })
  .strict();

export const SubtitleTimelineTrackSchema = z
  .object({
    id: TrackIdSchema,
    type: z.literal('subtitle'),
    time: TimelineTimeSchema,
    text: z.string().min(1),
    duration: TimelineDurationSchema,
    speaker: EntityIdSchema.optional(),
  })
  .strict();

export const SoundTimelineTrackSchema = z
  .object({
    id: TrackIdSchema,
    type: z.literal('sound'),
    time: TimelineTimeSchema,
    soundId: AssetIdSchema,
  })
  .strict();

export const TimelineTrackSchema = z.discriminatedUnion('type', [
  ActionTimelineTrackSchema,
  AnimationPlayTimelineTrackSchema,
  CameraShotTimelineTrackSchema,
  PropertyTimelineTrackSchema,
  WaitTimelineTrackSchema,
  SubtitleTimelineTrackSchema,
  SoundTimelineTrackSchema,
]);

export const TimelineSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: TimelineIdSchema,
    name: DisplayNameSchema.optional(),
    duration: TimelineDurationSchema,
    settings: TimelineSettingsSchema.optional(),
    tracks: z.array(TimelineTrackSchema),
  })
  .strict();

export type TimelineSettingsData = z.infer<typeof TimelineSettingsSchema>;
export type TimelineTrackData = z.infer<typeof TimelineTrackSchema>;
export type TimelineData = z.infer<typeof TimelineSchema>;
