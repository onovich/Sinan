import { useEffect, useRef, useState } from 'react';

import type { ProjectData } from '../data/DataRepository';
import { getRenderableModelAssetId, getRenderableRenderStyle } from '../data/projectDataSelectors';
import type {
  RuntimePalette,
  RuntimeDebugAabb,
  RuntimeRenderEnvironmentStyle,
  RuntimeRenderStyle,
  RuntimeTransform,
  TransformGizmoMode,
} from '../runtime/RuntimeTypes';
import type { WebRuntime } from '../runtime/WebRuntime';
import {
  AabbColliderComponentSchema,
  TriggerZoneComponentSchema,
} from '../schemas/collider.schema';
import type { EntityData } from '../schemas/entity.schema';
import type { TransformData } from '../schemas/transform.schema';
import type { ActiveTool } from './store/editorStore';
import { SelectionTool } from './tools/SelectionTool';

type ViewportStatus =
  | 'Waiting for level data'
  | 'Loading level data'
  | 'Level loaded'
  | 'Load failed';
type ViewportNavigationMode = 'idle' | 'pan' | 'orbit';

interface EditorCameraRuntime extends WebRuntime {
  handleEditorCameraWheel?: (input: {
    deltaX: number;
    deltaY: number;
    shiftKey: boolean;
    ctrlKey: boolean;
  }) => void;
  startEditorCameraDrag?: (mode: 'pan' | 'orbit', clientX: number, clientY: number) => void;
  updateEditorCameraDrag?: (clientX: number, clientY: number) => void;
  endEditorCameraDrag?: () => void;
  frameEntity?: (entityId: string) => void;
  frameAll?: () => void;
  resetEditorCamera?: () => void;
}

interface ViewportPointerInteraction {
  pointerId: number;
  startX: number;
  startY: number;
  mode: 'select' | 'pan' | 'orbit';
  dragged: boolean;
}

const viewportDragThresholdPx = 4;

export interface ViewportProps {
  project: ProjectData | null;
  selectionEnabled: boolean;
  showTriggerDebug: boolean;
  selectedEntityId: string | undefined;
  activeTool: ActiveTool;
  onSelectEntity: (entityId: string | undefined) => void;
  onTransformPreview?: (entityId: string, transform: TransformData) => void;
  onTransformCommit: (entityId: string, transform: TransformData) => void;
  onRuntimeReady?: (runtime: WebRuntime | null) => void;
}

export function Viewport({
  project,
  selectionEnabled,
  showTriggerDebug,
  selectedEntityId,
  activeTool,
  onSelectEntity,
  onTransformPreview,
  onTransformCommit,
  onRuntimeReady,
}: ViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<WebRuntime | null>(null);
  const selectionToolRef = useRef<SelectionTool | null>(null);
  const selectEntityRef = useRef(onSelectEntity);
  const transformPreviewRef = useRef(onTransformPreview);
  const transformCommitRef = useRef(onTransformCommit);
  const runtimeReadyRef = useRef(onRuntimeReady);
  const showTriggerDebugRef = useRef(showTriggerDebug);
  const selectedEntityIdRef = useRef(selectedEntityId);
  const pointerInteractionRef = useRef<ViewportPointerInteraction | undefined>(undefined);
  const [status, setStatus] = useState<ViewportStatus>('Waiting for level data');
  const [runtimeVersion, setRuntimeVersion] = useState(0);
  const [navigationMode, setNavigationMode] = useState<ViewportNavigationMode>('idle');

  useEffect(() => {
    selectEntityRef.current = onSelectEntity;
  }, [onSelectEntity]);

  useEffect(() => {
    transformPreviewRef.current = onTransformPreview;
  }, [onTransformPreview]);

  useEffect(() => {
    transformCommitRef.current = onTransformCommit;
  }, [onTransformCommit]);

  useEffect(() => {
    runtimeReadyRef.current = onRuntimeReady;
  }, [onRuntimeReady]);

  useEffect(() => {
    showTriggerDebugRef.current = showTriggerDebug;
  }, [showTriggerDebug]);

  useEffect(() => {
    selectedEntityIdRef.current = selectedEntityId;
  }, [selectedEntityId]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;

    if (!host || !canvas) {
      return undefined;
    }

    let runtime: WebRuntime | null = null;
    let resizeObserver: ResizeObserver | undefined;
    let frameId: number | undefined;
    let disposed = false;

    const readSize = () => {
      const rect = host.getBoundingClientRect();

      return {
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
        pixelRatio: window.devicePixelRatio,
      };
    };

    const startRuntime = async () => {
      const { ThreeRuntime } = await import('../runtime/three/ThreeRuntime');

      if (disposed) {
        return;
      }

      const activeRuntime = new ThreeRuntime();
      runtime = activeRuntime;
      runtimeRef.current = activeRuntime;
      runtimeReadyRef.current?.(activeRuntime);
      selectionToolRef.current = new SelectionTool(activeRuntime, (entityId) => {
        selectEntityRef.current(entityId);
      });

      activeRuntime.init({ canvas, ...readSize() });

      resizeObserver = new ResizeObserver(() => {
        activeRuntime.resize(readSize());
      });
      resizeObserver.observe(host);

      let lastTime = performance.now();
      const frame = (now: number) => {
        if (disposed) {
          return;
        }

        const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        activeRuntime.update(deltaSeconds);
        activeRuntime.render();
        frameId = window.requestAnimationFrame(frame);
      };

      frameId = window.requestAnimationFrame(frame);
      setRuntimeVersion((version) => version + 1);
    };

    void startRuntime().catch((error: unknown) => {
      console.error(error);
      if (!disposed) {
        setStatus('Load failed');
      }
    });

    return () => {
      disposed = true;
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
      }
      resizeObserver?.disconnect();
      runtime?.dispose();
      runtimeRef.current = null;
      runtimeReadyRef.current?.(null);
      selectionToolRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;

    if (!runtime || !project) {
      setStatus('Waiting for level data');
      return;
    }

    let disposed = false;
    setStatus('Loading level data');
    void loadProjectIntoRuntime(runtime, project, () => disposed)
      .then(() => {
        if (!disposed) {
          syncTriggerDebug(runtime, project, showTriggerDebugRef.current);
          setStatus('Level loaded');
        }
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!disposed) {
          setStatus('Load failed');
        }
      });

    return () => {
      disposed = true;
    };
  }, [project, runtimeVersion]);

  useEffect(() => {
    const runtime = runtimeRef.current;

    if (!runtime || !project) {
      return;
    }

    syncTriggerDebug(runtime, project, showTriggerDebug);
  }, [project, showTriggerDebug]);

  useEffect(() => {
    runtimeRef.current?.setSelectedEntity?.(selectedEntityId);
  }, [selectedEntityId]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    const mode = getTransformGizmoMode(activeTool);

    if (!runtime || !selectedEntityId || !mode) {
      runtime?.detachTransformGizmo();
      return;
    }

    runtime.setTransformGizmoMode(mode);
    runtime.attachTransformGizmo(selectedEntityId, {
      onChange: (event) => {
        transformPreviewRef.current?.(event.entityId, toTransformData(event.transform));
      },
      onCommit: (event) => {
        transformCommitRef.current(event.entityId, toTransformData(event.transform));
      },
    });

    return () => {
      runtime.detachTransformGizmo();
    };
  }, [activeTool, selectedEntityId, project]);

  return (
    <div
      ref={hostRef}
      className="viewport-placeholder"
      data-testid="viewport-placeholder"
      data-tool={activeTool}
      data-nav-mode={navigationMode}
      data-selection-enabled={selectionEnabled ? 'true' : 'false'}
    >
      <canvas
        ref={canvasRef}
        className="runtime-canvas"
        aria-label="Runtime viewport"
        tabIndex={0}
        onContextMenu={(event) => event.preventDefault()}
        onWheel={(event) => {
          getEditorCameraRuntime(runtimeRef.current)?.handleEditorCameraWheel?.({
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
          });
        }}
        onKeyDown={(event) => {
          const runtime = getEditorCameraRuntime(runtimeRef.current);

          if (event.key === 'f' || event.key === 'F') {
            const entityId = selectedEntityIdRef.current;

            if (entityId) {
              runtime?.frameEntity?.(entityId);
            }
            event.preventDefault();
          } else if (event.key === 'Home') {
            runtime?.frameAll?.();
            event.preventDefault();
          } else if (event.key === '0') {
            runtime?.resetEditorCamera?.();
            event.preventDefault();
          }
        }}
        onPointerDown={(event) => {
          event.currentTarget.focus();
          const runtime = getEditorCameraRuntime(runtimeRef.current);
          const mode =
            event.button === 2 ? 'pan' : event.button === 1 || event.altKey ? 'orbit' : undefined;

          if (mode && runtime?.startEditorCameraDrag) {
            event.preventDefault();
            pointerInteractionRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              mode,
              dragged: true,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            runtime.startEditorCameraDrag(mode, event.clientX, event.clientY);
            setNavigationMode(mode);
            return;
          }

          if (selectionEnabled && event.button === 0) {
            pointerInteractionRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              mode: 'select',
              dragged: false,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={(event) => {
          const interaction = pointerInteractionRef.current;

          if (!interaction || interaction.pointerId !== event.pointerId) {
            return;
          }

          const deltaX = event.clientX - interaction.startX;
          const deltaY = event.clientY - interaction.startY;

          if (Math.hypot(deltaX, deltaY) > viewportDragThresholdPx) {
            interaction.dragged = true;
          }

          if (interaction.mode === 'pan' || interaction.mode === 'orbit') {
            getEditorCameraRuntime(runtimeRef.current)?.updateEditorCameraDrag?.(
              event.clientX,
              event.clientY,
            );
          }
        }}
        onPointerUp={(event) => {
          const interaction = pointerInteractionRef.current;

          if (!interaction || interaction.pointerId !== event.pointerId) {
            return;
          }

          pointerInteractionRef.current = undefined;

          if (interaction.mode === 'pan' || interaction.mode === 'orbit') {
            getEditorCameraRuntime(runtimeRef.current)?.endEditorCameraDrag?.();
            setNavigationMode('idle');
            return;
          }

          if (!interaction.dragged && selectionEnabled) {
            selectionToolRef.current?.handlePointerDown(event);
          }
        }}
        onPointerCancel={() => {
          const interaction = pointerInteractionRef.current;

          pointerInteractionRef.current = undefined;

          if (interaction?.mode === 'pan' || interaction?.mode === 'orbit') {
            getEditorCameraRuntime(runtimeRef.current)?.endEditorCameraDrag?.();
            setNavigationMode('idle');
          }
        }}
      />
      <div className="viewport-status">
        <strong>Three Runtime</strong>
        <span>{formatViewportTelemetry(status, project, showTriggerDebug)}</span>
      </div>
    </div>
  );
}

function formatViewportTelemetry(
  status: ViewportStatus,
  project: ProjectData | null,
  showTriggerDebug: boolean,
): string {
  if (!project) {
    return status;
  }

  return `${formatRuntimeStatus(status)} / ${project.level.entities.length} entities / helpers ${
    showTriggerDebug ? 'on' : 'off'
  }`;
}

function formatRuntimeStatus(status: ViewportStatus): string {
  switch (status) {
    case 'Waiting for level data':
      return 'waiting';
    case 'Loading level data':
      return 'loading';
    case 'Level loaded':
      return 'runtime ready';
    case 'Load failed':
      return 'load failed';
  }
}

function syncTriggerDebug(
  runtime: WebRuntime,
  project: ProjectData,
  showTriggerDebug: boolean,
): void {
  for (const entity of project.level.entities) {
    runtime.setDebugAabb(entity.id, showTriggerDebug ? createTriggerDebugAabb(entity) : undefined);
  }
}

function createTriggerDebugAabb(entity: EntityData): RuntimeDebugAabb | undefined {
  const colliderResult = AabbColliderComponentSchema.safeParse(entity.components.Collider);

  if (!colliderResult.success) {
    return undefined;
  }

  const triggerZoneResult = TriggerZoneComponentSchema.safeParse(entity.components.TriggerZone);
  const isTrigger =
    colliderResult.data.isTrigger === true ||
    (triggerZoneResult.success && triggerZoneResult.data.enabled !== false);

  if (!isTrigger) {
    return undefined;
  }

  const { center, size, debugColor } = colliderResult.data;
  const { position, scale } = entity.transform;

  return {
    center: [
      position[0] + center[0] * scale[0],
      position[1] + center[1] * scale[1],
      position[2] + center[2] * scale[2],
    ],
    size: [
      Math.abs(size[0] * scale[0]),
      Math.abs(size[1] * scale[1]),
      Math.abs(size[2] * scale[2]),
    ],
    color: debugColor,
    visible: true,
  };
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

function getEditorCameraRuntime(runtime: WebRuntime | null): EditorCameraRuntime | undefined {
  return runtime ?? undefined;
}

function toTransformData(transform: RuntimeTransform): TransformData {
  return {
    position: [...transform.position],
    rotation: [...transform.rotation],
    scale: [...transform.scale],
  };
}

export async function loadProjectIntoRuntime(
  runtime: WebRuntime,
  project: ProjectData,
  isDisposed: () => boolean,
): Promise<void> {
  runtime.setStyleResources?.(toRuntimeStyleResources(project));
  runtime.setRenderEnvironment?.(toRuntimeRenderEnvironment(project.level.environment));

  await Promise.all(
    Object.entries(project.assets.assets)
      .filter(([, asset]) => asset.type === 'model')
      .map(([assetId, asset]) => runtime.loadModel(assetId, asset.url)),
  );

  for (const entity of project.level.entities) {
    if (isDisposed()) {
      return;
    }

    const modelAssetId = getRenderableModelAssetId(project, entity);

    if (modelAssetId) {
      runtime.instantiateModel(modelAssetId, entity.id);
    } else {
      runtime.createEmpty(entity.id);
    }

    runtime.setTransform(entity.id, entity.transform);
    runtime.setRenderStyle?.(
      entity.id,
      toRuntimeRenderStyle(getRenderableRenderStyle(project, entity)),
    );
  }
}

function toRuntimeStyleResources(project: ProjectData): {
  palettes: Record<string, RuntimePalette>;
} {
  return {
    palettes: Object.fromEntries(
      Object.entries(project.palettes).map(([paletteId, palette]) => [
        paletteId,
        {
          id: palette.id,
          tones: palette.tones,
        },
      ]),
    ),
  };
}

function toRuntimeRenderStyle(
  style: RuntimeRenderStyle | undefined,
): RuntimeRenderStyle | undefined {
  return style;
}

function toRuntimeRenderEnvironment(
  environment: ProjectData['level']['environment'],
): RuntimeRenderEnvironmentStyle | undefined {
  if (!environment) {
    return undefined;
  }

  return {
    background: environment.background,
    ambientLight: environment.ambientLight,
  };
}
