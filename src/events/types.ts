export type FlagValue = boolean | string | number;

export interface EventRuntimeState {
  flags: Record<string, FlagValue | undefined>;
  inventory: ReadonlySet<string>;
  questStates: Record<string, string | undefined>;
  entityStates: Record<string, Record<string, FlagValue | undefined> | undefined>;
  entityVisibility: Record<string, boolean | undefined>;
  doorStates: Record<string, { isOpen?: boolean } | undefined>;
}

export interface RuntimeActionPort {
  setVisible(entityId: string, visible: boolean): void;
}

export type DirectorCommand =
  | { type: 'timeline.play'; timelineId: string }
  | { type: 'timeline.stop'; timelineId: string };

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
    entityVisibility: {},
    doorStates: {},
    ...overrides,
  };
}
