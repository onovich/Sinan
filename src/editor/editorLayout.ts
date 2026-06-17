export type EditorPanelId = 'hierarchy' | 'viewport' | 'inspector' | 'timeline';

export interface EditorPanelDefinition {
  id: EditorPanelId;
  title: string;
}

export const editorPanelLayout: readonly EditorPanelDefinition[] = [
  { id: 'hierarchy', title: 'Hierarchy' },
  { id: 'viewport', title: 'Viewport' },
  { id: 'inspector', title: 'Inspector' },
  { id: 'timeline', title: 'Timeline' },
] as const;
