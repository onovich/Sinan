import { describe, expect, it } from 'vitest';

import type { WebRuntime } from '../../runtime/WebRuntime';
import { SelectionTool } from './SelectionTool';

describe('SelectionTool', () => {
  it('selects the picked entity', () => {
    const selected: Array<string | undefined> = [];
    const tool = new SelectionTool(createRuntimeMock('switch_a'), (entityId) => {
      selected.push(entityId);
    });

    tool.handlePointerDown({ clientX: 120, clientY: 240 });

    expect(selected).toEqual(['switch_a']);
  });

  it('clears selection when the runtime misses', () => {
    const selected: Array<string | undefined> = [];
    const tool = new SelectionTool(createRuntimeMock(undefined), (entityId) => {
      selected.push(entityId);
    });

    tool.handlePointerDown({ clientX: 0, clientY: 0 });

    expect(selected).toEqual([undefined]);
  });
});

function createRuntimeMock(entityId: string | undefined): WebRuntime {
  return {
    init: () => undefined,
    loadModel: (assetId: string) => Promise.resolve({ assetId }),
    instantiateModel: (_assetId: string, targetEntityId: string) => ({
      entityId: targetEntityId,
      runtimeObjectId: targetEntityId,
    }),
    createEmpty: (targetEntityId: string) => ({
      entityId: targetEntityId,
      runtimeObjectId: targetEntityId,
    }),
    destroyObject: () => undefined,
    setTransform: () => undefined,
    getTransform: () => null,
    setVisible: () => undefined,
    playAnimation: () => undefined,
    stopAnimation: () => undefined,
    setAnimationTime: () => undefined,
    pick: () => (entityId ? { entityId, point: [0, 0, 0] } : null),
    attachTransformGizmo: () => undefined,
    detachTransformGizmo: () => undefined,
    setTransformGizmoMode: () => undefined,
    update: () => undefined,
    render: () => undefined,
    resize: () => undefined,
    dispose: () => undefined,
  };
}
