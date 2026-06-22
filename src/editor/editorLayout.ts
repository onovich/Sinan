import type { ProjectData } from '../data/DataRepository';
import {
  createDeliveryHudViewModel,
  type DeliveryHudViewModel,
  type DeliveryHudViewModelInput,
} from '../game/delivery';
import type { ActiveTool, EditorMode } from './store/editorStore';

export type EditorPanelId = 'hierarchy' | 'viewport' | 'inspector' | 'timeline';

export interface EditorPanelDefinition {
  id: EditorPanelId;
  title: string;
}

export interface EditorShellModeState {
  isShowcase: boolean;
  mode: EditorMode;
  selectionEnabled: boolean;
  showEditorPanels: boolean;
  showEditorToolbarControls: boolean;
  showTimeline: boolean;
  showTriggerDebug: boolean;
  viewportActiveTool: ActiveTool;
  viewportAutoFocus: boolean;
}

export interface EditorShellModeStateInput {
  activeTool: ActiveTool;
  mode: EditorMode;
  triggerDebugVisible: boolean;
}

export type ShowcaseModeHud = DeliveryHudViewModel;
export type ShowcaseModeHudOptions = Omit<DeliveryHudViewModelInput, 'level'>;

export const editorModeOptions = ['edit', 'play', 'preview', 'showcase'] as const;

export const editorPanelLayout: readonly EditorPanelDefinition[] = [
  { id: 'hierarchy', title: 'Hierarchy' },
  { id: 'viewport', title: 'Viewport' },
  { id: 'inspector', title: 'Inspector' },
  { id: 'timeline', title: 'Timeline' },
] as const;

export function createEditorShellModeState({
  activeTool,
  mode,
  triggerDebugVisible,
}: EditorShellModeStateInput): EditorShellModeState {
  const isShowcase = mode === 'showcase';

  return {
    isShowcase,
    mode,
    selectionEnabled: mode === 'edit' && activeTool === 'select',
    showEditorPanels: !isShowcase,
    showEditorToolbarControls: !isShowcase,
    showTimeline: !isShowcase,
    showTriggerDebug: mode === 'edit' && triggerDebugVisible,
    viewportActiveTool: isShowcase ? 'select' : activeTool,
    viewportAutoFocus: isShowcase,
  };
}

export function createShowcaseModeHud(
  project: ProjectData | null,
  options: ShowcaseModeHudOptions = {},
): ShowcaseModeHud {
  if (!project) {
    return {
      activeJobStatus: 'unavailable',
      blocked: false,
      empty: true,
      endpointCount: 0,
      jobCount: 0,
      prompt: 'No delivery jobs loaded',
      promptVisible: true,
      routeMarkerCount: 0,
      stale: false,
      statusLabel: 'Unavailable',
      targetVisible: false,
      title: 'Delivery Showcase',
      tone: 'muted',
    };
  }

  return createDeliveryHudViewModel({
    ...options,
    level: project.level,
  });
}
