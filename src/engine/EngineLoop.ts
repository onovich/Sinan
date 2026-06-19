import type { EngineMode } from './EngineMode';

export interface EngineFrameContext {
  deltaSeconds: number;
  mode: EngineMode;
}

export interface EngineLoopHooks {
  render?: (context: EngineFrameContext) => void;
  update?: (context: EngineFrameContext) => void;
}

export interface EngineFrameScheduler {
  cancelFrame: (handle: number) => void;
  now: () => number;
  requestFrame: (callback: (timeMs: number) => void) => number;
}

export interface EngineLoopStartOptions {
  maxDeltaSeconds?: number;
}

export class EngineLoop {
  private disposed = false;
  private frameHandle: number | undefined;
  private mode: EngineMode;
  private scheduler: Pick<EngineFrameScheduler, 'cancelFrame'> | undefined;

  constructor(
    private readonly hooks: EngineLoopHooks,
    initialMode: EngineMode = 'edit',
  ) {
    this.mode = initialMode;
  }

  dispose(): void {
    this.stop();
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

  start(scheduler: EngineFrameScheduler, options: EngineLoopStartOptions = {}): void {
    if (this.disposed || this.frameHandle !== undefined) {
      return;
    }

    const maxDeltaSeconds = options.maxDeltaSeconds ?? 0.05;
    let lastTime = scheduler.now();
    this.scheduler = scheduler;

    const frame = (now: number) => {
      if (this.disposed || this.frameHandle === undefined) {
        return;
      }

      const deltaSeconds = Math.min(Math.max(0, (now - lastTime) / 1000), maxDeltaSeconds);
      lastTime = now;
      this.step(deltaSeconds);

      if (!this.disposed && this.frameHandle !== undefined) {
        this.frameHandle = scheduler.requestFrame(frame);
      }
    };

    this.frameHandle = scheduler.requestFrame(frame);
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

  stop(scheduler?: Pick<EngineFrameScheduler, 'cancelFrame'>): void {
    if (this.frameHandle === undefined) {
      return;
    }

    (scheduler ?? this.scheduler)?.cancelFrame(this.frameHandle);
    this.frameHandle = undefined;
    this.scheduler = undefined;
  }
}
