import type { EngineMode } from './EngineMode';

export interface EngineFrameContext {
  deltaSeconds: number;
  elapsedSeconds: number;
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

export interface EngineLoopOptions {
  maxDeltaSeconds?: number;
}

export class EngineLoop {
  private disposed = false;
  private elapsedSeconds = 0;
  private frameHandle: number | undefined;
  private readonly maxDeltaSeconds: number;
  private mode: EngineMode;
  private scheduler: Pick<EngineFrameScheduler, 'cancelFrame'> | undefined;

  constructor(
    private readonly hooks: EngineLoopHooks,
    initialMode: EngineMode = 'edit',
    options: EngineLoopOptions = {},
  ) {
    this.mode = initialMode;
    this.maxDeltaSeconds = normalizeMaxDeltaSeconds(options.maxDeltaSeconds);
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

    const maxDeltaSeconds = normalizeMaxDeltaSeconds(
      options.maxDeltaSeconds ?? this.maxDeltaSeconds,
    );
    let lastTime = scheduler.now();
    this.scheduler = scheduler;

    const frame = (now: number) => {
      if (this.disposed || this.frameHandle === undefined) {
        return;
      }

      const deltaSeconds = clampDeltaSeconds((now - lastTime) / 1000, maxDeltaSeconds);
      lastTime = now;
      this.dispatchFrame(deltaSeconds);

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

    this.dispatchFrame(clampDeltaSeconds(deltaSeconds, this.maxDeltaSeconds));
  }

  stop(scheduler?: Pick<EngineFrameScheduler, 'cancelFrame'>): void {
    if (this.frameHandle === undefined) {
      return;
    }

    (scheduler ?? this.scheduler)?.cancelFrame(this.frameHandle);
    this.frameHandle = undefined;
    this.scheduler = undefined;
  }

  private dispatchFrame(deltaSeconds: number): void {
    this.elapsedSeconds += deltaSeconds;
    const context = {
      deltaSeconds,
      elapsedSeconds: this.elapsedSeconds,
      mode: this.mode,
    };

    this.hooks.update?.(context);
    this.hooks.render?.(context);
  }
}

function normalizeMaxDeltaSeconds(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0.05;
}

function clampDeltaSeconds(deltaSeconds: number, maxDeltaSeconds: number): number {
  if (!Number.isFinite(deltaSeconds)) {
    return 0;
  }

  return Math.min(Math.max(0, deltaSeconds), maxDeltaSeconds);
}
