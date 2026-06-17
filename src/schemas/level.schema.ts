import { z } from 'zod';

import {
  CameraShotIdSchema,
  DisplayNameSchema,
  EventIdSchema,
  HexColorSchema,
  SchemaVersionSchema,
  StableIdSchema,
  TimelineIdSchema,
} from './common.schema';
import { EntitySchema } from './entity.schema';

export const LevelEnvironmentSchema = z
  .object({
    background: HexColorSchema.optional(),
    ambientLight: z.number().min(0).max(10).optional(),
  })
  .strict();

export const LevelSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: StableIdSchema,
    name: DisplayNameSchema,
    environment: LevelEnvironmentSchema.optional(),
    entities: z.array(EntitySchema),
    events: z.array(EventIdSchema).default([]),
    timelines: z.array(TimelineIdSchema).default([]),
    cameraShots: z.array(CameraShotIdSchema).default([]),
  })
  .strict();

export type LevelEnvironmentData = z.infer<typeof LevelEnvironmentSchema>;
export type LevelData = z.infer<typeof LevelSchema>;
