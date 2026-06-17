import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import cameraShotJson from '../../../data/cameraShots/cam_gate_reveal.json';
import { CameraShotSchema } from '../../schemas/cameraShot.schema';
import { CameraShotPanel } from './CameraShotPanel';

const cameraShot = CameraShotSchema.parse(cameraShotJson);

describe('CameraShotPanel smoke', () => {
  it('renders keyframe authoring commands for keyframed shots', () => {
    const markup = renderToStaticMarkup(
      <CameraShotPanel
        shots={[cameraShot]}
        selectedShot={cameraShot}
        selectedEntityId="gate_a"
        saveStatus="idle"
        isDirty={false}
        previewStatus="Ready"
        onSelectShot={() => undefined}
        onCreateShot={() => undefined}
        onApplyShot={() => undefined}
        onSaveShot={() => undefined}
        onSetKeyFromView={() => undefined}
        onPreviewShot={() => undefined}
      />,
    );

    expect(markup).toContain('Camera Shots');
    expect(markup).toContain('Add Key');
    expect(markup).toContain('Move Up');
    expect(markup).toContain('Move Down');
    expect(markup).toContain('Remove Key');
    expect(markup).toContain('View Through Camera');
  });
});
