import type { ProjectData } from '../data/DataRepository';
import type { WebRuntime } from '../runtime/WebRuntime';
import { World } from '../world';
import { EngineLoop } from './EngineLoop';
import type { EngineMode } from './EngineMode';

export type EngineSessionStatus = 'idle' | 'loaded' | 'disposed';

export interface EngineSessionOptions {
  mode?: EngineMode;
  runtime: Pick<WebRuntime, 'dispose' | 'render' | 'update'>;
}

export class EngineSession {
  private readonly loop: EngineLoop;
  private status: EngineSessionStatus = 'idle';
  private world: World | undefined;

  constructor(private readonly options: EngineSessionOptions) {
    this.loop = new EngineLoop(
      {
        update: ({ deltaSeconds }) => {
          this.options.runtime.update(deltaSeconds);
        },
        render: () => {
          this.options.runtime.render();
        },
      },
      options.mode ?? 'edit',
    );
  }

  dispose(): void {
    if (this.status === 'disposed') {
      return;
    }

    this.loop.dispose();
    this.options.runtime.dispose();
    this.world = undefined;
    this.status = 'disposed';
  }

  getMode(): EngineMode {
    return this.loop.getMode();
  }

  getStatus(): EngineSessionStatus {
    return this.status;
  }

  getWorld(): World | undefined {
    return this.world;
  }

  loadProject(project: ProjectData): World {
    this.ensureActive();
    this.world = World.fromLevel(project.level);
    this.status = 'loaded';

    return this.world;
  }

  setMode(mode: EngineMode): void {
    this.ensureActive();
    this.loop.setMode(mode);
  }

  step(deltaSeconds: number): void {
    this.ensureActive();
    this.loop.step(deltaSeconds);
  }

  private ensureActive(): void {
    if (this.status === 'disposed') {
      throw new Error('EngineSession has been disposed.');
    }
  }
}
