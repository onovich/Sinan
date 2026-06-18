import { z } from 'zod';

import { AabbColliderComponentSchema, TriggerZoneComponentSchema } from './collider.schema';
import { AssetIdSchema, ComponentTypeSchema } from './common.schema';
import { RenderStyleSchema } from './renderStyle.schema';

export const ComponentPayloadSchema = z.record(z.string(), z.unknown());
export const ComponentMapSchema = z.record(ComponentTypeSchema, ComponentPayloadSchema);

export const RenderableComponentSchema = z
  .object({
    model: AssetIdSchema,
    renderStyle: RenderStyleSchema.optional(),
  })
  .strict();

export const DoorComponentSchema = z
  .object({
    locked: z.boolean().default(false),
    requiredKey: z.string().min(1).optional(),
    openAngle: z.number().min(0).max(180).optional(),
    openDuration: z.number().positive().optional(),
    openAmount: z.number().min(0).max(1).optional(),
  })
  .strict();

export const SwitchComponentSchema = z
  .object({
    initialState: z.boolean().default(false),
  })
  .strict();

export const InteractableComponentSchema = z
  .object({
    prompt: z.string().min(1).max(80).optional(),
  })
  .strict();

export const PlayerSpawnComponentSchema = z
  .object({
    kind: z.string().min(1).max(40).default('default'),
  })
  .strict();

export const KnownComponentSchemas = {
  Collider: AabbColliderComponentSchema,
  Door: DoorComponentSchema,
  Interactable: InteractableComponentSchema,
  PlayerSpawn: PlayerSpawnComponentSchema,
  Renderable: RenderableComponentSchema,
  Switch: SwitchComponentSchema,
  TriggerZone: TriggerZoneComponentSchema,
} as const;

export type ComponentPayloadData = z.infer<typeof ComponentPayloadSchema>;
export type ComponentMapData = z.infer<typeof ComponentMapSchema>;
export type KnownComponentType = keyof typeof KnownComponentSchemas;

export function isKnownComponentType(componentType: string): componentType is KnownComponentType {
  return componentType in KnownComponentSchemas;
}

export function parseKnownComponentPayload(componentType: string, payload: unknown) {
  if (!isKnownComponentType(componentType)) {
    return undefined;
  }

  return KnownComponentSchemas[componentType].safeParse(payload);
}
