export type EditorMode = 'edit' | 'play' | 'preview';
export type ActiveTool = 'select' | 'move' | 'rotate' | 'scale' | 'camera';
export type InspectorTab = 'components' | 'events' | 'timeline' | 'camera';

export interface EditorState {
  mode: EditorMode;
  selectedEntityId?: string;
  selectedEventId?: string;
  selectedTimelineId?: string;
  selectedTimelineTrackId?: string;
  selectedCameraShotId?: string;
  activeTool: ActiveTool;
  timelineTime: number;
  inspectorTab: InspectorTab;
}

export type EditorAction =
  | { type: 'setMode'; mode: EditorMode }
  | { type: 'selectEntity'; entityId: string | undefined }
  | { type: 'selectEvent'; eventId: string | undefined }
  | { type: 'selectTimeline'; timelineId: string | undefined }
  | { type: 'selectTimelineTrack'; trackId: string | undefined }
  | { type: 'selectCameraShot'; cameraShotId: string | undefined }
  | { type: 'setActiveTool'; activeTool: ActiveTool }
  | { type: 'setInspectorTab'; inspectorTab: InspectorTab }
  | { type: 'setTimelineTime'; timelineTime: number };

export function createInitialEditorState(): EditorState {
  return {
    mode: 'edit',
    activeTool: 'select',
    timelineTime: 0,
    inspectorTab: 'components',
  };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'setMode':
      return { ...state, mode: action.mode };
    case 'selectEntity':
      return { ...state, selectedEntityId: action.entityId };
    case 'selectEvent':
      return { ...state, selectedEventId: action.eventId };
    case 'selectTimeline':
      return { ...state, selectedTimelineId: action.timelineId };
    case 'selectTimelineTrack':
      return { ...state, selectedTimelineTrackId: action.trackId };
    case 'selectCameraShot':
      return { ...state, selectedCameraShotId: action.cameraShotId };
    case 'setActiveTool':
      return { ...state, activeTool: action.activeTool };
    case 'setInspectorTab':
      return { ...state, inspectorTab: action.inspectorTab };
    case 'setTimelineTime':
      return { ...state, timelineTime: action.timelineTime };
  }
}
