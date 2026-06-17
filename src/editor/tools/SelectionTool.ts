import type { WebRuntime } from '../../runtime/WebRuntime';

export interface PointerLike {
  clientX: number;
  clientY: number;
}

export type SelectEntityCallback = (entityId: string | undefined) => void;

export class SelectionTool {
  constructor(
    private readonly runtime: WebRuntime,
    private readonly selectEntity: SelectEntityCallback,
  ) {}

  handlePointerDown(pointer: PointerLike): void {
    const result = this.runtime.pick(pointer.clientX, pointer.clientY);
    this.selectEntity(result?.entityId);
  }
}
