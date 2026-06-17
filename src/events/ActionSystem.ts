import type { ActionData } from '../schemas/action.schema';
import {
  createDefaultActionRegistry,
  type ActionRegistry,
  type ActionSideEffect,
} from './actionRegistry';
import type { ActionExecutionContext } from './types';

export class ActionSystem {
  constructor(private readonly registry: ActionRegistry = createDefaultActionRegistry()) {}

  dispatch(action: ActionData, context: ActionExecutionContext): void {
    this.registry.dispatch(action, context);
  }

  dispatchAll(actions: readonly ActionData[], context: ActionExecutionContext): void {
    for (const action of actions) {
      this.dispatch(action, context);
    }
  }

  getSideEffect(action: ActionData): ActionSideEffect {
    return this.registry.getSideEffect(action.type);
  }
}
