import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { EntityData } from '../../schemas/entity.schema';
import type { RenderableMaterialSlotData } from '../../schemas/material.schema';
import type { TransformData } from '../../schemas/transform.schema';
import { STORY_GATE_DISSOLVE_MATERIAL_ID } from '../../runtime/materials';
import { InspectorPanel } from './InspectorPanel';
import {
  type MaterialInspectableRenderable,
  updateRenderableMaterialParameter,
} from './MaterialInspector';

const transform: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

describe('InspectorPanel material inspector', () => {
  it('renders public material parameters for the selected renderable entity', () => {
    const markup = renderToStaticMarkup(<InspectorPanel entity={createMaterialEntity()} />);

    expect(markup).toContain('Materials');
    expect(markup).toContain('Gate Dissolve');
    expect(markup).toContain('story.gate-dissolve');
    expect(markup).toContain('Progress');
    expect(markup).toContain('Current 0.25');
    expect(markup).toContain('Default 0');
    expect(markup).toContain('Overridden');
    expect(markup).not.toContain('uProgress');
    expect(markup).not.toContain('fragmentShader');
    expect(markup).not.toContain('vertexShader');
  });

  it('renders validation state for unknown material definitions', () => {
    const markup = renderToStaticMarkup(
      <InspectorPanel
        entity={createMaterialEntity({
          materialId: 'story.missing',
          parameters: {
            progress: 0.5,
          },
        })}
      />,
    );

    expect(markup).toContain('Issues');
    expect(markup).toContain('materialId: Missing material definition &quot;story.missing&quot;.');
  });

  it('updates one public parameter while preserving unrelated renderable data', () => {
    const renderable: MaterialInspectableRenderable = {
      model: 'model.door_wood',
      renderStyle: {
        profile: 'palette-toon',
        palette: 'warm',
      },
      materials: {
        main: {
          materialId: STORY_GATE_DISSOLVE_MATERIAL_ID,
          parameters: {
            progress: 0.25,
            edgeColor: '#ffcf70',
          },
        },
      },
    };

    expect(updateRenderableMaterialParameter(renderable, 'main', 'progress', 0.75)).toEqual({
      model: 'model.door_wood',
      renderStyle: {
        profile: 'palette-toon',
        palette: 'warm',
      },
      materials: {
        main: {
          materialId: STORY_GATE_DISSOLVE_MATERIAL_ID,
          parameters: {
            progress: 0.75,
            edgeColor: '#ffcf70',
          },
        },
      },
    });
  });
});

function createMaterialEntity(
  material: RenderableMaterialSlotData = createMaterialSlot(),
): EntityData {
  return {
    id: 'gate_a',
    name: 'Gate A',
    prefab: 'door_wood',
    transform,
    components: {
      Renderable: {
        model: 'model.door_wood',
        renderStyle: {
          profile: 'palette-toon',
          palette: 'warm',
        },
        materials: {
          main: material,
        },
      },
      Door: {
        locked: false,
      },
    },
  };
}

function createMaterialSlot(): RenderableMaterialSlotData {
  return {
    materialId: STORY_GATE_DISSOLVE_MATERIAL_ID,
    parameters: {
      progress: 0.25,
      edgeColor: '#ffcf70',
    },
  };
}
