import { z } from 'zod';

import { HexColorSchema } from './common.schema';

export const MaterialIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/, 'Use a stable lowercase material id.');

export const MaterialSlotNameSchema = z
  .string()
  .min(1)
  .regex(/^[a-z][A-Za-z0-9_-]*$/, 'Use a stable material slot name without spaces.');

export const MaterialParameterNameSchema = z
  .string()
  .min(1)
  .regex(/^[a-z][A-Za-z0-9]*(?:[._-][A-Za-z0-9]+)*$/, 'Use a public parameter name.')
  .refine((name) => !/^u[A-Z]/.test(name), 'Raw uniform names are not public parameters.');

export const MaterialVec2ParameterSchema = z.tuple([z.number(), z.number()]);
export const MaterialVec3ParameterSchema = z.tuple([z.number(), z.number(), z.number()]);

export const MaterialParameterValueSchema = z.union([
  z.number().finite(),
  z.boolean(),
  HexColorSchema,
  z.string().min(1),
  MaterialVec2ParameterSchema,
  MaterialVec3ParameterSchema,
  z.null(),
]);

export const RenderableMaterialSlotSchema = z
  .object({
    materialId: MaterialIdSchema,
    parameters: z.record(MaterialParameterNameSchema, MaterialParameterValueSchema).optional(),
  })
  .strict();

export const RenderableMaterialSlotsSchema = z.record(
  MaterialSlotNameSchema,
  RenderableMaterialSlotSchema,
);

export type MaterialIdData = z.infer<typeof MaterialIdSchema>;
export type MaterialSlotNameData = z.infer<typeof MaterialSlotNameSchema>;
export type MaterialParameterNameData = z.infer<typeof MaterialParameterNameSchema>;
export type MaterialParameterValueData = z.infer<typeof MaterialParameterValueSchema>;
export type RenderableMaterialSlotData = z.infer<typeof RenderableMaterialSlotSchema>;
export type RenderableMaterialSlotsData = z.infer<typeof RenderableMaterialSlotsSchema>;
