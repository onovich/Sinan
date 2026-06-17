import { useEffect, useRef, useState } from 'react';

import type { ProjectData } from '../data/DataRepository';
import { getRenderableModelAssetId } from '../data/projectDataSelectors';
import type {
  RuntimeDebugAabb,
  RuntimeTransform,
  TransformGizmoMode,
} from '../runtime/RuntimeTypes';
import type { WebRuntime } from '../runtime/WebRuntime';
import { ThreeRuntime } from '../runtime/three/ThreeRuntime';
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

export interface ViewportProps {
  project: ProjectData | null;
  selectionEnabled: boolean;
  showTriggerDebug: boolean;
  selectedEntityId: string | undefined;
  activeTool: ActiveTool;
  onSelectEntity: (entityId: string | undefined) => void;
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
  onTransformCommit,
  onRuntimeReady,
}: ViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<WebRuntime | null>(null);
  const selectionToolRef = useRef<SelectionTool | null>(null);
  const selectEntityRef = useRef(onSelectEntity);
  const transformCommitRef = useRef(onTransformCommit);
  const runtimeReadyRef = useRef(onRuntimeReady);
  const showTriggerDebugRef = useRef(showTriggerDebug);
  const [status, setStatus] = useState<ViewportStatus>('Waiting for level data');

  useEffect(() => {
    selectEntityRef.current = onSelectEntity;
  }, [onSelectEntity]);

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
    const host = hostRef.current;
    const canvas = canvasRef.current;

    if (!host || !canvas) {
      return undefined;
    }

    const runtime = new ThreeRuntime();
    runtimeRef.current = runtime;
    runtimeReadyRef.current?.(runtime);
    selectionToolRef.current = new SelectionTool(runtime, (entityId) => {
      selectEntityRef.current(entityId);
    });

    const readSize = () => {
      const rect = host.getBoundingClientRect();

      return {
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
        pixelRatio: window.devicePixelRatio,
      };
    };

    runtime.init({ canvas, ...readSize() });

    const resizeObserver = new ResizeObserver(() => {
      runtime.resize(readSize());
    });
    resizeObserver.observe(host);

    let frameId = 0;
    let lastTime = performance.now();
    let disposed = false;

    const frame = (now: number) => {
      if (disposed) {
        return;
      }

      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      runtime.update(deltaSeconds);
      runtime.render();
      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      runtime.dispose();
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
  }, [project]);

  useEffect(() => {
    const runtime = runtimeRef.current;

    if (!runtime || !project) {
      return;
    }

    syncTriggerDebug(runtime, project, showTriggerDebug);
  }, [project, showTriggerDebug]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    const mode = getTransformGizmoMode(activeTool);

    if (!runtime || !selectedEntityId || !mode) {
      runtime?.detachTransformGizmo();
      return;
    }

    runtime.setTransformGizmoMode(mode);
    runtime.attachTransformGizmo(selectedEntityId, {
      onCommit: (event) => {
        transformCommitRef.current(event.entityId, toTransformData(event.transform));
      },
    });

    return () => {
      runtime.detachTransformGizmo();
    };
  }, [activeTool, selectedEntityId, project]);

  return (
    <div ref={hostRef} className="viewport-placeholder" data-testid="viewport-placeholder">
      <canvas
        ref={canvasRef}
        className="runtime-canvas"
        aria-label="Runtime viewport"
        onPointerDown={(event) => {
          if (selectionEnabled) {
            selectionToolRef.current?.handlePointerDown(event);
          }
        }}
      />
      <div className="viewport-status">
        <strong>Editor Viewport</strong>
        <span>{status}</span>
      </div>
    </div>
  );
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

function toTransformData(transform: RuntimeTransform): TransformData {
  return {
    position: [...transform.position],
    rotation: [...transform.rotation],
    scale: [...transform.scale],
  };
}

async function loadProjectIntoRuntime(
  runtime: WebRuntime,
  project: ProjectData,
  isDisposed: () => boolean,
): Promise<void> {
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
  }
}
