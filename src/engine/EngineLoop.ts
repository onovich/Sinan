import type { EngineMode } from './EngineMode';

export interface EngineFrameContext {
  deltaSeconds: number;
  mode: EngineMode;
}

export interface EngineLoopHooks {
  render?: (context: EngineFrameContext) => void;
  update?: (context: EngineFrameContext) => void;
}

export class EngineLoop {
  private disposed = false;
  private mode: EngineMode;

  constructor(
    private readonly hooks: EngineLoopHooks,
    initialMode: EngineMode = 'edit',
  ) {
    this.mode = initialMode;
  }

  dispose(): void {
    this.disposed = true;
  }

  getMode(): EngineMode {
    return this.mode;
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  setMode(mode: EngineMode): void {
    this.mode = mode;
  }

  step(deltaSeconds: number): void {
    if (this.disposed) {
      return;
    }

    const context = {
      deltaSeconds: Math.max(0, deltaSeconds),
      mode: this.mode,
    };

    this.hooks.update?.(context);
    this.hooks.render?.(context);
  }
}
