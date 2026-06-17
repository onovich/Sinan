import type { RuntimeInitOptions, RuntimeSize } from './RuntimeTypes';
import type { ModelHandle, RuntimeObjectHandle } from './RuntimeObjectHandle';
import type { RuntimeTransform } from './RuntimeTypes';

export interface WebRuntime {
  init(options: RuntimeInitOptions): void;
  loadModel(assetId: string, url: string): Promise<ModelHandle>;
  instantiateModel(assetId: string, entityId: string): RuntimeObjectHandle;
  createEmpty(entityId: string): RuntimeObjectHandle;
  destroyObject(entityId: string): void;
  setTransform(entityId: string, transform: RuntimeTransform): void;
  getTransform(entityId: string): RuntimeTransform | null;
  setVisible(entityId: string, visible: boolean): void;
  update(deltaSeconds: number): void;
  render(): void;
  resize(size: RuntimeSize): void;
  dispose(): void;
}
