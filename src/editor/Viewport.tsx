import { useEffect, useRef, useState } from 'react';

import type { ProjectData } from '../data/DataRepository';
import { EngineSession } from '../engine/EngineSession';
import type {
  RuntimeCameraPose,
  RuntimeLodDiagnostics,
  RuntimeScatterDiagnostics,
  RuntimeSphericalPlacementDiagnostics,
} from '../runtime/RuntimeTypes';
import type { WebRuntime } from '../runtime/WebRuntime';
import type { TransformData } from '../schemas/transform.schema';
import type {
  SurfaceMovementCommand,
  SurfaceMovementOptions,
  WorldSurfaceMovementResult,
} from '../world';
import { EditorSessionBridge, readEditorRuntimeStyleQualityProfile } from './EditorSessionBridge';
import type { ActiveTool } from './store/editorStore';

type ViewportStatus =
  | 'Waiting for level data'
  | 'Loading level data'
  | 'Level loaded'
  | 'Load failed';
type ViewportNavigationMode = 'idle' | 'pan' | 'orbit';

interface ViewportPointerInteraction {
  pointerId: number;
  startX: number;
  startY: number;
  mode: 'select' | 'pan' | 'orbit';
  dragged: boolean;
}

interface RuntimeDiagnosticsSnapshot {
  lod: readonly RuntimeLodDiagnostics[];
  scatter: readonly RuntimeScatterDiagnostics[];
  spherical: RuntimeSphericalPlacementDiagnostics;
}

interface RuntimeDiagnosticsWindow {
  __SINAN_RUNTIME_DIAGNOSTICS__?: () => RuntimeDiagnosticsSnapshot;
  __SINAN_RUNTIME_APPLY_CAMERA_POSE__?: (pose: RuntimeCameraPose) => RuntimeCameraPose;
  __SINAN_RUNTIME_STEP_SPHERICAL_MOVEMENT__?: (
    entityId: string,
    command: SurfaceMovementCommand,
    options?: SurfaceMovementOptions,
  ) => WorldSurfaceMovementResult;
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
  const bridgeRef = useRef<EditorSessionBridge | null>(null);
  const sessionRef = useRef<EngineSession | null>(null);
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

    let session: EngineSession | null = null;
    let resizeObserver: ResizeObserver | undefined;
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
      activeRuntime.init({ canvas, ...readSize() });

      const activeSession = new EngineSession({
        runtime: activeRuntime,
        styleQualityProfile: readEditorRuntimeStyleQualityProfile(),
      });
      const activeBridge = new EditorSessionBridge(activeSession, activeRuntime, (entityId) => {
        selectEntityRef.current(entityId);
      });

      session = activeSession;
      sessionRef.current = activeSession;
      bridgeRef.current = activeBridge;
      runtimeReadyRef.current?.(activeRuntime);
      if (readEditorRuntimeDiagnosticsEnabled()) {
        installRuntimeDiagnostics(activeRuntime, activeSession);
      }

      resizeObserver = new ResizeObserver(() => {
        activeSession.resize(readSize());
      });
      resizeObserver.observe(host);
      activeSession.startLoop(createBrowserFrameScheduler());
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
      resizeObserver?.disconnect();
      clearRuntimeDiagnostics();
      session?.dispose();
      sessionRef.current = null;
      bridgeRef.current = null;
      runtimeReadyRef.current?.(null);
    };
  }, []);

  useEffect(() => {
    const session = sessionRef.current;

    if (!session || !project) {
      setStatus('Waiting for level data');
      return;
    }

    let disposed = false;
    setStatus('Loading level data');
    void session
      .loadProject(project, { isCancelled: () => disposed })
      .then((world) => {
        if (!disposed && world) {
          bridgeRef.current?.setTriggerDebugVisible(showTriggerDebugRef.current);
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
    bridgeRef.current?.setTriggerDebugVisible(showTriggerDebug);
  }, [project, showTriggerDebug]);

  useEffect(() => {
    bridgeRef.current?.setSelectedEntity(selectedEntityId);
  }, [selectedEntityId]);

  useEffect(() => {
    const bridge = bridgeRef.current;

    if (!bridge) {
      return;
    }

    bridge.syncTransformGizmo({
      activeTool,
      selectedEntityId,
      onPreview: (entityId, transform) => {
        transformPreviewRef.current?.(entityId, transform);
      },
      onCommit: (entityId, transform) => {
        transformCommitRef.current(entityId, transform);
      },
    });

    return () => {
      bridge.detachTransformGizmo();
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
          bridgeRef.current?.handleEditorCameraWheel({
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
          });
        }}
        onKeyDown={(event) => {
          if (event.key === 'f' || event.key === 'F') {
            const entityId = selectedEntityIdRef.current;

            if (entityId) {
              bridgeRef.current?.frameEntity(entityId);
            }
            event.preventDefault();
          } else if (event.key === 'Home') {
            bridgeRef.current?.frameAll();
            event.preventDefault();
          } else if (event.key === '0') {
            bridgeRef.current?.resetEditorCamera();
            event.preventDefault();
          }
        }}
        onPointerDown={(event) => {
          event.currentTarget.focus();
          const mode =
            event.button === 2 ? 'pan' : event.button === 1 || event.altKey ? 'orbit' : undefined;

          if (
            mode &&
            bridgeRef.current?.startEditorCameraDrag(mode, event.clientX, event.clientY)
          ) {
            event.preventDefault();
            pointerInteractionRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              mode,
              dragged: true,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
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
            bridgeRef.current?.updateEditorCameraDrag(event.clientX, event.clientY);
          }
        }}
        onPointerUp={(event) => {
          const interaction = pointerInteractionRef.current;

          if (!interaction || interaction.pointerId !== event.pointerId) {
            return;
          }

          pointerInteractionRef.current = undefined;

          if (interaction.mode === 'pan' || interaction.mode === 'orbit') {
            bridgeRef.current?.endEditorCameraDrag();
            setNavigationMode('idle');
            return;
          }

          if (!interaction.dragged && selectionEnabled) {
            bridgeRef.current?.handleSelectionPointer(event);
          }
        }}
        onPointerCancel={() => {
          const interaction = pointerInteractionRef.current;

          pointerInteractionRef.current = undefined;

          if (interaction?.mode === 'pan' || interaction?.mode === 'orbit') {
            bridgeRef.current?.endEditorCameraDrag();
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

function createBrowserFrameScheduler() {
  return {
    cancelFrame: (handle: number) => window.cancelAnimationFrame(handle),
    now: () => performance.now(),
    requestFrame: (callback: (timeMs: number) => void) => window.requestAnimationFrame(callback),
  };
}

function readEditorRuntimeDiagnosticsEnabled(
  search = typeof window === 'undefined' ? '' : window.location.search,
): boolean {
  return new URLSearchParams(search).get('runtimeDiagnostics') === '1';
}

function installRuntimeDiagnostics(runtime: WebRuntime, session: EngineSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  const diagnosticsWindow = window as unknown as RuntimeDiagnosticsWindow;
  diagnosticsWindow.__SINAN_RUNTIME_DIAGNOSTICS__ = () => ({
    lod: runtime.getLodDiagnostics?.() ?? [],
    scatter: runtime.getScatterDiagnostics?.() ?? [],
    spherical: runtime.getSphericalPlacementDiagnostics?.() ?? {
      issueCount: 0,
      issues: [],
      placementCount: 0,
      placements: [],
    },
  });
  diagnosticsWindow.__SINAN_RUNTIME_STEP_SPHERICAL_MOVEMENT__ = (entityId, command, options) =>
    session.stepSphericalMovement(entityId, command, options);
  diagnosticsWindow.__SINAN_RUNTIME_APPLY_CAMERA_POSE__ = (pose) => {
    runtime.setCameraPose(pose);

    return pose;
  };
}

function clearRuntimeDiagnostics(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const diagnosticsWindow = window as unknown as RuntimeDiagnosticsWindow;
  delete diagnosticsWindow.__SINAN_RUNTIME_DIAGNOSTICS__;
  delete diagnosticsWindow.__SINAN_RUNTIME_STEP_SPHERICAL_MOVEMENT__;
  delete diagnosticsWindow.__SINAN_RUNTIME_APPLY_CAMERA_POSE__;
}
