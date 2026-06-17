import type { RuntimeInitOptions, RuntimeSize } from './RuntimeTypes';

export interface WebRuntime {
  init(options: RuntimeInitOptions): void;
  update(deltaSeconds: number): void;
  render(): void;
  resize(size: RuntimeSize): void;
  dispose(): void;
}
