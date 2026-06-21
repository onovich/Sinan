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
import { ScatterGroupSchema } from './scatter.schema';

const LevelEnvironmentFogSchema = z
  .object({
    enabled: z.boolean().default(true),
    color: HexColorSchema.optional(),
    near: z.number().min(0).optional(),
    far: z.number().positive().optional(),
  })
  .strict()
  .superRefine((fog, context) => {
    if (fog.near !== undefined && fog.far !== undefined && fog.far <= fog.near) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fog far distance must be greater than near distance.',
        path: ['far'],
      });
    }
  });

const LevelEnvironmentColorGradeSchema = z
  .object({
    enabled: z.boolean().default(true),
    exposure: z.number().min(0).max(4).optional(),
    saturation: z.number().min(0).max(3).optional(),
  })
  .strict();

export const LevelEnvironmentSchema = z
  .object({
    background: HexColorSchema.optional(),
    ambientLight: z.number().min(0).max(10).optional(),
    fog: LevelEnvironmentFogSchema.optional(),
    colorGrade: LevelEnvironmentColorGradeSchema.optional(),
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
    scatterGroups: z.array(ScatterGroupSchema).default([]),
  })
  .strict();

export type LevelEnvironmentData = z.infer<typeof LevelEnvironmentSchema>;
type LevelSchemaData = z.infer<typeof LevelSchema>;
export type LevelData = Omit<LevelSchemaData, 'scatterGroups'> & {
  scatterGroups?: LevelSchemaData['scatterGroups'];
};
