import type { ComponentPayloadData } from '../../schemas/component.schema';
import type { RenderableMaterialSlotsData } from '../../schemas/material.schema';
import type { MaterialParameterValue } from '../../runtime/materials';

export interface MaterialInspectableRenderable {
  model: string;
  renderStyle?: unknown;
  materials?: RenderableMaterialSlotsData;
}

export function updateRenderableMaterialParameter(
  renderable: MaterialInspectableRenderable,
  slotName: string,
  parameterName: string,
  value: MaterialParameterValue,
): ComponentPayloadData {
  const materialSlots = renderable.materials ?? {};
  const materialSlot = materialSlots[slotName];

  if (!materialSlot) {
    return { ...renderable };
  }

  return {
    ...renderable,
    materials: {
      ...materialSlots,
      [slotName]: {
        ...materialSlot,
        parameters: {
          ...(materialSlot.parameters ?? {}),
          [parameterName]: value,
        },
      },
    },
  };
}
