import type { ConditionData } from '../schemas/condition.schema';
import type { EventRuntimeState } from './types';

export type TypedConditionData = Extract<ConditionData, { type: string }>;
export type ConditionEvaluator = (
  condition: TypedConditionData,
  state: EventRuntimeState,
) => boolean;

export class ConditionRegistry {
  private readonly evaluators = new Map<string, ConditionEvaluator>();

  register(type: string, evaluator: ConditionEvaluator): void {
    this.evaluators.set(type, evaluator);
  }

  has(type: string): boolean {
    return this.evaluators.has(type);
  }

  evaluate(condition: TypedConditionData, state: EventRuntimeState): boolean {
    const evaluator = this.evaluators.get(condition.type);

    if (!evaluator) {
      throw new Error(`Condition type is not registered: ${condition.type}`);
    }

    return evaluator(condition, state);
  }
}

export function createDefaultConditionRegistry(): ConditionRegistry {
  const registry = new ConditionRegistry();

  registry.register('flag.equals', (condition, state) => {
    if (condition.type !== 'flag.equals') {
      return false;
    }

    return state.flags[condition.flag] === condition.value;
  });

  registry.register('flag.exists', (condition, state) => {
    if (condition.type !== 'flag.exists') {
      return false;
    }

    return state.flags[condition.flag] !== undefined;
  });

  registry.register('inventory.hasItem', (condition, state) => {
    if (condition.type !== 'inventory.hasItem') {
      return false;
    }

    return state.inventory.has(condition.itemId);
  });

  registry.register('quest.stateEquals', (condition, state) => {
    if (condition.type !== 'quest.stateEquals') {
      return false;
    }

    return state.questStates[condition.questId] === condition.state;
  });

  registry.register('entity.stateEquals', (condition, state) => {
    if (condition.type !== 'entity.stateEquals') {
      return false;
    }

    return state.entityStates[condition.entityId]?.[condition.state] === condition.value;
  });

  return registry;
}
