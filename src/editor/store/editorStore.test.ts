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

  it('tracks selected event as slow editor state', () => {
    const selected = editorReducer(createInitialEditorState(), {
      type: 'selectEvent',
      eventId: 'ev_switch_a_open_gate',
    });

    expect(selected.selectedEventId).toBe('ev_switch_a_open_gate');
  });

  it('tracks selected camera shot as slow editor state', () => {
    const selected = editorReducer(createInitialEditorState(), {
      type: 'selectCameraShot',
      cameraShotId: 'cam_gate_reveal',
    });

    expect(selected.selectedCameraShotId).toBe('cam_gate_reveal');
  });
});
