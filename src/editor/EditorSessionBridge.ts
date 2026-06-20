import type { EngineSession } from '../engine/EngineSession';
import type {
  RuntimeMaterialParameterUpdate,
  RuntimeTransform,
  TransformGizmoCallbacks,
  TransformGizmoMode,
} from '../runtime/RuntimeTypes';
import type { WebRuntime } from '../runtime/WebRuntime';
import type { TransformData } from '../schemas/transform.schema';
import type { ActiveTool } from './store/editorStore';
import { SelectionTool, type PointerLike } from './tools/SelectionTool';

type ViewportCameraDragMode = 'pan' | 'orbit';

interface EditorCameraRuntime extends WebRuntime {
  endEditorCameraDrag?: () => void;
  frameAll?: () => void;
  frameEntity?: (entityId: string) => void;
  handleEditorCameraWheel?: (input: {
    ctrlKey: boolean;
    deltaX: number;
    deltaY: number;
    shiftKey: boolean;
  }) => void;
  resetEditorCamera?: () => void;
  startEditorCameraDrag?: (mode: ViewportCameraDragMode, clientX: number, clientY: number) => void;
  updateEditorCameraDrag?: (clientX: number, clientY: number) => void;
}

export interface TransformGizmoSyncOptions {
  activeTool: ActiveTool;
  onCommit: (entityId: string, transform: TransformData) => void;
  onPreview?: (entityId: string, transform: TransformData) => void;
  selectedEntityId: string | undefined;
}

export class EditorSessionBridge {
  private readonly selectionTool: SelectionTool;

  constructor(
    private readonly session: EngineSession,
    private readonly runtime: EditorCameraRuntime,
    selectEntity: (entityId: string | undefined) => void,
  ) {
    this.selectionTool = new SelectionTool(runtime, selectEntity);
  }

  detachTransformGizmo(): void {
    this.runtime.detachTransformGizmo();
  }

  endEditorCameraDrag(): void {
    this.runtime.endEditorCameraDrag?.();
  }

  frameAll(): void {
    this.runtime.frameAll?.();
  }

  frameEntity(entityId: string): void {
    this.runtime.frameEntity?.(entityId);
  }

  handleEditorCameraWheel(input: {
    ctrlKey: boolean;
    deltaX: number;
    deltaY: number;
    shiftKey: boolean;
  }): void {
    this.runtime.handleEditorCameraWheel?.(input);
  }

  handleSelectionPointer(pointer: PointerLike): void {
    this.selectionTool.handlePointerDown(pointer);
  }

  resetEditorCamera(): void {
    this.runtime.resetEditorCamera?.();
  }

  setSelectedEntity(entityId: string | undefined): void {
    this.session.setSelectedEntity(entityId);
  }

  setMaterialParameter(update: RuntimeMaterialParameterUpdate): void {
    this.session.setMaterialParameter(update);
  }

  setTriggerDebugVisible(visible: boolean): void {
    this.session.setTriggerDebugVisible(visible);
  }

  startEditorCameraDrag(mode: ViewportCameraDragMode, clientX: number, clientY: number): boolean {
    if (!this.runtime.startEditorCameraDrag) {
      return false;
    }

    this.runtime.startEditorCameraDrag(mode, clientX, clientY);

    return true;
  }

  syncTransformGizmo(options: TransformGizmoSyncOptions): void {
    const mode = getTransformGizmoMode(options.activeTool);

    if (!options.selectedEntityId || !mode) {
      this.runtime.detachTransformGizmo();
      return;
    }

    this.runtime.setTransformGizmoMode(mode);
    this.runtime.attachTransformGizmo(options.selectedEntityId, toGizmoCallbacks(options));
  }

  updateEditorCameraDrag(clientX: number, clientY: number): void {
    this.runtime.updateEditorCameraDrag?.(clientX, clientY);
  }
}

export function readEditorRuntimeStyleQualityProfile(
  search = typeof window === 'undefined' ? '' : window.location.search,
): 'standard' | 'low-end' {
  return new URLSearchParams(search).get('styleQuality') === 'low-end' ? 'low-end' : 'standard';
}

function getTransformGizmoMode(activeTool: ActiveTool): TransformGizmoMode | undefined {
  if (activeTool === 'move') {
    return 'translate';
  }

  if (activeTool === 'rotate' || activeTool === 'scale') {
    return activeTool;
  }

  return undefined;
}

function toGizmoCallbacks(options: TransformGizmoSyncOptions): TransformGizmoCallbacks {
  return {
    onChange: (event) => {
      options.onPreview?.(event.entityId, toTransformData(event.transform));
    },
    onCommit: (event) => {
      options.onCommit(event.entityId, toTransformData(event.transform));
    },
  };
}

function toTransformData(transform: RuntimeTransform): TransformData {
  return {
    position: [...transform.position],
    rotation: [...transform.rotation],
    scale: [...transform.scale],
  };
}
