import { describe, expect, it } from 'vitest';

import { createInitialEditorState, editorReducer } from './editorStore';

describe('editorReducer', () => {
  it('tracks slow editor selection state', () => {
    const selected = editorReducer(createInitialEditorState(), {
      type: 'selectEntity',
      entityId: 'switch_a',
    });

    expect(selected.selectedEntityId).toBe('switch_a');
  });

  it('changes mode without touching selected entity', () => {
    const state = {
      ...createInitialEditorState(),
      selectedEntityId: 'gate_a',
    };

    expect(editorReducer(state, { type: 'setMode', mode: 'preview' })).toMatchObject({
      mode: 'preview',
      selectedEntityId: 'gate_a',
    });
  });
});
