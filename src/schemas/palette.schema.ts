import { z } from 'zod';

import { HexColorSchema, SchemaVersionSchema, StableIdSchema } from './common.schema';

export const PaletteToneMapSchema = z
  .record(StableIdSchema, HexColorSchema)
  .refine((tones) => Object.keys(tones).length > 0, 'Palette must define at least one tone.');

export const PaletteSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: StableIdSchema,
    tones: PaletteToneMapSchema,
  })
  .strict();

export type PaletteToneMapData = z.infer<typeof PaletteToneMapSchema>;
export type PaletteData = z.infer<typeof PaletteSchema>;
