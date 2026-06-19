import { describe, expect, it } from 'vitest';

import { EngineSession } from '../engine/EngineSession';
import type {
  PickResult,
  RuntimeSize,
  RuntimeTransform,
  TransformGizmoCallbacks,
} from '../runtime/RuntimeTypes';
import type { WebRuntime } from '../runtime/WebRuntime';
import { EditorSessionBridge } from './EditorSessionBridge';

const transform: RuntimeTransform = {
  position: [1, 2, 3],
  rotation: [0, 0, 0, 1],
  scale: [2, 2, 2],
};

describe('EditorSessionBridge', () => {
  it('routes selection and editor camera input through the runtime adapter', () => {
    const calls: unknown[] = [];
    const selected: Array<string | undefined> = [];
    const runtime = createRuntimeProbe(calls, {
      pickResult: {
        entityId: 'switch_a',
        point: [0, 0, 0],
      },
    });
    const bridge = new EditorSessionBridge(new EngineSession({ runtime }), runtime, (entityId) =>
      selected.push(entityId),
    );

    bridge.handleSelectionPointer({ clientX: 12, clientY: 24 });
    bridge.handleEditorCameraWheel({
      ctrlKey: false,
      deltaX: 1,
      deltaY: -2,
      shiftKey: true,
    });
    expect(bridge.startEditorCameraDrag('pan', 4, 8)).toBe(true);
    bridge.updateEditorCameraDrag(6, 9);
    bridge.endEditorCameraDrag();
    bridge.frameEntity('switch_a');
    bridge.frameAll();
    bridge.resetEditorCamera();

    expect(selected).toEqual(['switch_a']);
    expect(calls).toEqual([
      { type: 'pick', clientX: 12, clientY: 24 },
      {
        type: 'cameraWheel',
        input: {
          ctrlKey: false,
          deltaX: 1,
          deltaY: -2,
          shiftKey: true,
        },
      },
      { type: 'startCameraDrag', mode: 'pan', clientX: 4, clientY: 8 },
      { type: 'updateCameraDrag', clientX: 6, clientY: 9 },
      { type: 'endCameraDrag' },
      { type: 'frameEntity', entityId: 'switch_a' },
      { type: 'frameAll' },
      { type: 'resetCamera' },
    ]);
  });

  it('syncs selected entity, trigger debug, and transform gizmo callbacks', () => {
    const calls: unknown[] = [];
    const previews: unknown[] = [];
    const commits: unknown[] = [];
    const runtime = createRuntimeProbe(calls);
    const session = new EngineSession({ runtime });
    const bridge = new EditorSessionBridge(session, runtime, () => undefined);

    bridge.setSelectedEntity('switch_a');
    bridge.syncTransformGizmo({
      activeTool: 'move',
      selectedEntityId: 'switch_a',
      onPreview: (entityId, value) => previews.push({ entityId, value }),
      onCommit: (entityId, value) => commits.push({ entityId, value }),
    });

    runtime.gizmoCallbacks?.onChange?.({ entityId: 'switch_a', transform });
    runtime.gizmoCallbacks?.onCommit?.({ entityId: 'switch_a', transform });
    bridge.syncTransformGizmo({
      activeTool: 'select',
      selectedEntityId: 'switch_a',
      onCommit: () => undefined,
    });

    expect(previews).toEqual([{ entityId: 'switch_a', value: transform }]);
    expect(commits).toEqual([{ entityId: 'switch_a', value: transform }]);
    expect(calls).toEqual([
      { type: 'setSelectedEntity', entityId: 'switch_a' },
      { type: 'setTransformGizmoMode', mode: 'translate' },
      { type: 'attachTransformGizmo', entityId: 'switch_a' },
      { type: 'detachTransformGizmo' },
    ]);
  });
});

interface RuntimeProbe extends WebRuntime {
  endEditorCameraDrag: () => void;
  frameAll: () => void;
  frameEntity: (entityId: string) => void;
  gizmoCallbacks: TransformGizmoCallbacks | undefined;
  handleEditorCameraWheel: (input: {
    ctrlKey: boolean;
    deltaX: number;
    deltaY: number;
    shiftKey: boolean;
  }) => void;
  resetEditorCamera: () => void;
  startEditorCameraDrag: (mode: 'pan' | 'orbit', clientX: number, clientY: number) => void;
  updateEditorCameraDrag: (clientX: number, clientY: number) => void;
}

function createRuntimeProbe(
  calls: unknown[],
  options: { pickResult?: PickResult | null } = {},
): RuntimeProbe {
  return {
    gizmoCallbacks: undefined,
    init: () => undefined,
    loadModel: (assetId) => Promise.resolve({ assetId }),
    instantiateModel: (assetId, entityId) => ({ entityId, runtimeObjectId: assetId }),
    createEmpty: (entityId) => ({ entityId, runtimeObjectId: entityId }),
    destroyObject: () => undefined,
    setTransform: () => undefined,
    getTransform: () => null,
    setVisible: () => undefined,
    playAnimation: () => undefined,
    stopAnimation: () => undefined,
    setAnimationTime: () => undefined,
    setCameraPose: () => undefined,
    setDebugAabb: () => undefined,
    setSelectedEntity: (entityId) => calls.push({ type: 'setSelectedEntity', entityId }),
    pick: (clientX, clientY) => {
      calls.push({ type: 'pick', clientX, clientY });

      return options.pickResult ?? null;
    },
    attachTransformGizmo(entityId, callbacks) {
      calls.push({ type: 'attachTransformGizmo', entityId });
      this.gizmoCallbacks = callbacks;
    },
    detachTransformGizmo: () => calls.push({ type: 'detachTransformGizmo' }),
    setTransformGizmoMode: (mode) => calls.push({ type: 'setTransformGizmoMode', mode }),
    update: () => undefined,
    render: () => undefined,
    resize: (size: RuntimeSize) => calls.push({ type: 'resize', size }),
    dispose: () => undefined,
    handleEditorCameraWheel: (input) => calls.push({ type: 'cameraWheel', input }),
    startEditorCameraDrag: (mode, clientX, clientY) =>
      calls.push({ type: 'startCameraDrag', mode, clientX, clientY }),
    updateEditorCameraDrag: (clientX, clientY) =>
      calls.push({ type: 'updateCameraDrag', clientX, clientY }),
    endEditorCameraDrag: () => calls.push({ type: 'endCameraDrag' }),
    frameEntity: (entityId) => calls.push({ type: 'frameEntity', entityId }),
    frameAll: () => calls.push({ type: 'frameAll' }),
    resetEditorCamera: () => calls.push({ type: 'resetCamera' }),
  };
}
