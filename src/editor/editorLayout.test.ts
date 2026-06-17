import { describe, expect, it } from 'vitest';

import { editorPanelLayout } from './editorLayout';

describe('editorPanelLayout', () => {
  it('defines the first editor shell panels', () => {
    expect(editorPanelLayout.map((panel) => panel.id)).toEqual([
      'hierarchy',
      'viewport',
      'inspector',
      'timeline',
    ]);
  });
});
