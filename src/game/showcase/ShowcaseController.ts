import {
  resolveNearestInteraction,
  type InteractionCandidate,
  type InteractionSolverOptions,
  type InteractionSolverResult,
} from '../interaction';
import type {
  SurfaceMovementCommand,
  SurfaceMovementOptions,
  World,
  WorldSurfaceMovementResult,
} from '../../world';

export type ShowcaseControllerControl =
  | 'interact'
  | 'moveBackward'
  | 'moveForward'
  | 'turnLeft'
  | 'turnRight';

export type ShowcaseControllerInputEvent =
  | {
      code: string;
      repeat?: boolean;
      targetEditable?: boolean;
      type: 'keyDown';
    }
  | {
      code: string;
      targetEditable?: boolean;
      type: 'keyUp';
    }
  | {
      button: number;
      targetEditable?: boolean;
      type: 'pointerDown';
    }
  | {
      type: 'blur' | 'focus' | 'reset';
    };

export type ShowcaseControllerSmokeCommand =
  | {
      deltaSeconds: number;
      forward: number;
      turn: number;
      type: 'move';
    }
  | {
      type: 'interact';
    }
  | {
      type: 'reset';
    };

export type ShowcaseInteractionResult =
  | InteractionSolverResult
  | {
      actorEntityId: string;
      issues: [];
      message: string;
      ok: false;
      reason: 'world_unloaded';
    };

export interface ShowcaseInteractionCommand {
  actorEntityId: string;
  candidate?: InteractionCandidate;
  result: ShowcaseInteractionResult;
  sequence: number;
}

export interface ShowcaseControllerHost {
  getWorld?: () => World | undefined;
  onInteractionCommand?: (command: ShowcaseInteractionCommand) => void;
  stepMovement: (
    entityId: string,
    command: SurfaceMovementCommand,
    options?: SurfaceMovementOptions,
  ) => WorldSurfaceMovementResult;
}

export interface ShowcaseControllerEngineSession {
  getWorld(): World | undefined;
  stepSphericalMovement(
    entityId: string,
    command: SurfaceMovementCommand,
    options?: SurfaceMovementOptions,
  ): WorldSurfaceMovementResult;
}

export interface ShowcaseControllerSessionHostOptions {
  onInteractionCommand?: (command: ShowcaseInteractionCommand) => void;
  session: ShowcaseControllerEngineSession;
}

export interface ShowcaseControllerOptions {
  actorEntityId: string;
  enabled?: boolean;
  focused?: boolean;
  host: ShowcaseControllerHost;
  interactionOptions?: InteractionSolverOptions;
  movementOptions?: SurfaceMovementOptions;
}

export interface ShowcaseControllerSnapshot {
  actorEntityId: string;
  enabled: boolean;
  focused: boolean;
  heldControls: ShowcaseControllerControl[];
  pendingInteraction: boolean;
  sequence: number;
}

export interface ShowcaseControllerStepResult {
  interaction?: ShowcaseInteractionCommand;
  movement?: WorldSurfaceMovementResult;
  snapshot: ShowcaseControllerSnapshot;
}

const orderedControls: ShowcaseControllerControl[] = [
  'moveForward',
  'moveBackward',
  'turnLeft',
  'turnRight',
  'interact',
];

export function createShowcaseControllerSessionHost({
  onInteractionCommand,
  session,
}: ShowcaseControllerSessionHostOptions): ShowcaseControllerHost {
  return {
    getWorld: () => session.getWorld(),
    onInteractionCommand,
    stepMovement: (entityId, command, options) =>
      session.stepSphericalMovement(entityId, command, options),
  };
}

export function mapShowcaseKeyToControl(code: string): ShowcaseControllerControl | undefined {
  switch (code) {
    case 'ArrowUp':
    case 'KeyW':
      return 'moveForward';
    case 'ArrowDown':
    case 'KeyS':
      return 'moveBackward';
    case 'ArrowLeft':
    case 'KeyA':
      return 'turnLeft';
    case 'ArrowRight':
    case 'KeyD':
      return 'turnRight';
    case 'Enter':
    case 'KeyE':
    case 'Space':
      return 'interact';
    default:
      return undefined;
  }
}

export class ShowcaseController {
  private enabled: boolean;
  private focused: boolean;
  private readonly heldControls = new Set<ShowcaseControllerControl>();
  private pendingInteraction = false;
  private sequence = 0;

  constructor(private readonly options: ShowcaseControllerOptions) {
    this.enabled = options.enabled ?? true;
    this.focused = options.focused ?? true;
  }

  executeSmokeCommand(command: ShowcaseControllerSmokeCommand): ShowcaseControllerStepResult {
    if (command.type === 'reset') {
      this.reset();

      return {
        snapshot: this.getSnapshot(),
      };
    }

    if (!this.canDrive()) {
      return {
        snapshot: this.getSnapshot(),
      };
    }

    if (command.type === 'interact') {
      return {
        interaction: this.dispatchInteraction(),
        snapshot: this.getSnapshot(),
      };
    }

    return {
      movement: this.options.host.stepMovement(
        this.options.actorEntityId,
        normalizeMovementCommand(command),
        this.options.movementOptions,
      ),
      snapshot: this.getSnapshot(),
    };
  }

  getSnapshot(): ShowcaseControllerSnapshot {
    return {
      actorEntityId: this.options.actorEntityId,
      enabled: this.enabled,
      focused: this.focused,
      heldControls: orderedControls.filter((control) => this.heldControls.has(control)),
      pendingInteraction: this.pendingInteraction,
      sequence: this.sequence,
    };
  }

  handleInput(event: ShowcaseControllerInputEvent): void {
    if (event.type === 'blur') {
      this.setFocused(false);
      return;
    }

    if (event.type === 'focus') {
      this.setFocused(true);
      return;
    }

    if (event.type === 'reset') {
      this.reset();
      return;
    }

    if (event.type === 'keyUp') {
      const control = mapShowcaseKeyToControl(event.code);

      if (control) {
        this.release(control);
      }
      return;
    }

    if (event.type === 'pointerDown') {
      if (!this.canAcceptInput() || event.targetEditable) {
        return;
      }

      if (event.button === 0) {
        this.queueInteraction();
      }
      return;
    }

    if (event.type !== 'keyDown') {
      return;
    }

    if (!this.canAcceptInput() || event.targetEditable) {
      return;
    }

    const control = mapShowcaseKeyToControl(event.code);

    if (!control) {
      return;
    }

    if (control === 'interact') {
      if (!event.repeat) {
        this.queueInteraction();
      }
      return;
    }

    this.press(control);
  }

  reset(): void {
    this.heldControls.clear();
    this.pendingInteraction = false;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (!enabled) {
      this.reset();
    }
  }

  setFocused(focused: boolean): void {
    this.focused = focused;

    if (!focused) {
      this.reset();
    }
  }

  step(deltaSeconds: number): ShowcaseControllerStepResult {
    if (!this.canDrive()) {
      return {
        snapshot: this.getSnapshot(),
      };
    }

    const movementCommand = this.createMovementCommand(deltaSeconds);
    const movement =
      movementCommand.forward !== 0 || movementCommand.turn !== 0
        ? this.options.host.stepMovement(
            this.options.actorEntityId,
            movementCommand,
            this.options.movementOptions,
          )
        : undefined;
    const interaction = this.pendingInteraction ? this.dispatchInteraction() : undefined;

    this.pendingInteraction = false;

    return {
      ...(interaction ? { interaction } : {}),
      ...(movement ? { movement } : {}),
      snapshot: this.getSnapshot(),
    };
  }

  private canAcceptInput(): boolean {
    return this.enabled && this.focused;
  }

  private canDrive(): boolean {
    return this.enabled && this.focused;
  }

  private createMovementCommand(deltaSeconds: number): SurfaceMovementCommand {
    const forward =
      (this.heldControls.has('moveForward') ? 1 : 0) +
      (this.heldControls.has('moveBackward') ? -1 : 0);
    const turn =
      (this.heldControls.has('turnRight') ? 1 : 0) + (this.heldControls.has('turnLeft') ? -1 : 0);

    return normalizeMovementCommand({
      deltaSeconds,
      forward,
      turn,
    });
  }

  private dispatchInteraction(): ShowcaseInteractionCommand {
    const world = this.options.host.getWorld?.();
    const result: ShowcaseInteractionResult = world
      ? resolveNearestInteraction(
          world,
          this.options.actorEntityId,
          this.options.interactionOptions,
        )
      : {
          actorEntityId: this.options.actorEntityId,
          issues: [],
          message: 'No world is loaded for showcase interaction.',
          ok: false,
          reason: 'world_unloaded',
        };
    const command: ShowcaseInteractionCommand = {
      actorEntityId: this.options.actorEntityId,
      ...(result.ok && result.nearest ? { candidate: result.nearest } : {}),
      result,
      sequence: this.nextSequence(),
    };

    this.options.host.onInteractionCommand?.(command);

    return command;
  }

  private nextSequence(): number {
    this.sequence += 1;

    return this.sequence;
  }

  private press(control: ShowcaseControllerControl): void {
    this.heldControls.add(control);
  }

  private queueInteraction(): void {
    this.pendingInteraction = true;
  }

  private release(control: ShowcaseControllerControl): void {
    this.heldControls.delete(control);
  }
}

function normalizeMovementCommand(command: SurfaceMovementCommand): SurfaceMovementCommand {
  return {
    deltaSeconds: normalizeDeltaSeconds(command.deltaSeconds),
    forward: normalizeAxis(command.forward),
    turn: normalizeAxis(command.turn),
  };
}

function normalizeAxis(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value > 0) {
    return 1;
  }

  if (value < 0) {
    return -1;
  }

  return 0;
}

function normalizeDeltaSeconds(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
