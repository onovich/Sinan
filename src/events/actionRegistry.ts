import type { ActionData } from '../schemas/action.schema';
import type { ActionExecutionContext } from './types';

export type ActionSideEffect = 'none' | 'previewSafe' | 'runtimeOnly' | 'destructive';
export type ActionHandler = (action: ActionData, context: ActionExecutionContext) => void;

export interface ActionRegistrationOptions {
  sideEffect?: ActionSideEffect;
}

export class ActionRegistry {
  private readonly handlers = new Map<string, ActionHandler>();
  private readonly sideEffects = new Map<string, ActionSideEffect>();

  register(type: string, handler: ActionHandler, options: ActionRegistrationOptions = {}): void {
    this.handlers.set(type, handler);
    this.sideEffects.set(type, options.sideEffect ?? 'runtimeOnly');
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }

  dispatch(action: ActionData, context: ActionExecutionContext): void {
    const handler = this.handlers.get(action.type);

    if (!handler) {
      throw new Error(`Action type is not registered: ${action.type}`);
    }

    handler(action, context);
  }

  getSideEffect(type: string): ActionSideEffect {
    const sideEffect = this.sideEffects.get(type);

    if (!sideEffect) {
      throw new Error(`Action type is not registered: ${type}`);
    }

    return sideEffect;
  }
}

export function createDefaultActionRegistry(): ActionRegistry {
  const registry = new ActionRegistry();

  registry.register(
    'flag.set',
    (action, context) => {
      if (action.type === 'flag.set') {
        context.state.flags[action.flag] = action.value;
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'flag.toggle',
    (action, context) => {
      if (action.type === 'flag.toggle') {
        context.state.flags[action.flag] = context.state.flags[action.flag] !== true;
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'entity.setVisible',
    (action, context) => {
      if (action.type === 'entity.setVisible') {
        context.state.entityVisibility[action.entityId] = action.visible;
        context.runtime?.setVisible(action.entityId, action.visible);
      }
    },
    { sideEffect: 'previewSafe' },
  );

  registry.register(
    'door.open',
    (action, context) => {
      if (action.type === 'door.open') {
        context.state.doorStates[action.entityId] = { isOpen: true };
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'door.close',
    (action, context) => {
      if (action.type === 'door.close') {
        context.state.doorStates[action.entityId] = { isOpen: false };
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'switch.setState',
    (action, context) => {
      if (action.type === 'switch.setState') {
        context.state.entityStates[action.entityId] = {
          ...context.state.entityStates[action.entityId],
          Switch: action.value,
        };
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'timeline.play',
    (action, context) => {
      if (action.type === 'timeline.play') {
        context.directorCommands.push({ type: 'timeline.play', timelineId: action.timelineId });
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'timeline.stop',
    (action, context) => {
      if (action.type === 'timeline.stop') {
        context.directorCommands.push({ type: 'timeline.stop', timelineId: action.timelineId });
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  return registry;
}
