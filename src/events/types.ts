import type { TransformData } from '../schemas/transform.schema';

export type FlagValue = boolean | string | number;

export interface EventRuntimeState {
  flags: Record<string, FlagValue | undefined>;
  inventory: ReadonlySet<string>;
  questStates: Record<string, string | undefined>;
  entityStates: Record<string, Record<string, FlagValue | undefined> | undefined>;
  entityEnabled: Record<string, boolean | undefined>;
  entityTransforms: Record<string, TransformData | undefined>;
  entityVisibility: Record<string, boolean | undefined>;
  doorStates: Record<string, { isOpen?: boolean } | undefined>;
}

export interface RuntimeActionPort {
  setVisible?(entityId: string, visible: boolean): void;
  setTransform?(entityId: string, transform: TransformData): void;
  playAnimation?(options: {
    entityId: string;
    clip: string;
    loop?: boolean;
    fadeIn?: number;
    fadeOut?: number;
  }): void;
  stopAnimation?(options: { entityId: string; clip?: string; fadeOut?: number }): void;
}

export type DirectorCommand =
  | { type: 'timeline.play'; timelineId: string }
  | { type: 'timeline.stop'; timelineId: string }
  | {
      type: 'entity.animateTransform';
      entityId: string;
      to: TransformData;
      duration: number;
      ease?: string;
    }
  | {
      type: 'animation.play';
      entityId: string;
      clip: string;
      loop?: boolean;
      fadeIn?: number;
      fadeOut?: number;
    }
  | {
      type: 'animation.stop';
      entityId: string;
      clip?: string;
      fadeOut?: number;
    }
  | {
      type: 'camera.shot.play';
      shotId: string;
      duration?: number;
      blendIn?: number;
      blendOut?: number;
    }
  | {
      type: 'camera.shot.sample';
      shotId: string;
      time: number;
    }
  | {
      type: 'sound.play';
      soundId: string;
    }
  | {
      type: 'subtitle.show';
      text: string;
      duration: number;
      speaker?: string;
    };

export interface ActionExecutionContext {
  state: EventRuntimeState;
  runtime?: RuntimeActionPort;
  directorCommands: DirectorCommand[];
}

export function createEventRuntimeState(
  overrides: Partial<EventRuntimeState> = {},
): EventRuntimeState {
  return {
    flags: {},
    inventory: new Set(),
    questStates: {},
    entityStates: {},
    entityEnabled: {},
    entityTransforms: {},
    entityVisibility: {},
    doorStates: {},
    ...overrides,
  };
}
