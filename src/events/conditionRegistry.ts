import type { ConditionData } from '../schemas/condition.schema';
import type { EventRuntimeState } from './types';

export type TypedConditionData = Extract<ConditionData, { type: string }>;
export type ConditionEvaluator = (
  condition: TypedConditionData,
  state: EventRuntimeState,
) => boolean;
export type CustomConditionEvaluator = (
  params: Readonly<Record<string, unknown>>,
  state: EventRuntimeState,
) => boolean;

export class ConditionRegistry {
  private readonly evaluators = new Map<string, ConditionEvaluator>();
  private readonly customConditions = new Map<string, CustomConditionEvaluator>();

  register(type: string, evaluator: ConditionEvaluator): void {
    this.evaluators.set(type, evaluator);
  }

  has(type: string): boolean {
    return this.evaluators.has(type);
  }

  types(): string[] {
    return Array.from(this.evaluators.keys()).sort((left, right) => left.localeCompare(right));
  }

  registerCustomCondition(name: string, evaluator: CustomConditionEvaluator): void {
    this.customConditions.set(name, evaluator);
  }

  hasCustomCondition(name: string): boolean {
    return this.customConditions.has(name);
  }

  customConditionNames(): string[] {
    return Array.from(this.customConditions.keys()).sort((left, right) =>
      left.localeCompare(right),
    );
  }

  evaluate(condition: TypedConditionData, state: EventRuntimeState): boolean {
    const evaluator = this.evaluators.get(condition.type);

    if (!evaluator) {
      throw new Error(`Condition type is not registered: ${condition.type}`);
    }

    return evaluator(condition, state);
  }

  evaluateCustomCondition(
    name: string,
    params: Readonly<Record<string, unknown>>,
    state: EventRuntimeState,
  ): boolean {
    const evaluator = this.customConditions.get(name);

    if (!evaluator) {
      throw new Error(`Condition function is not whitelisted: ${name}`);
    }

    return evaluator(params, state);
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

  registry.register('distance.lessThan', (condition, state) => {
    if (condition.type !== 'distance.lessThan') {
      return false;
    }

    const transformA = state.entityTransforms[condition.entityA];
    const transformB = state.entityTransforms[condition.entityB];

    if (!transformA || !transformB) {
      return false;
    }

    const dx = transformA.position[0] - transformB.position[0];
    const dy = transformA.position[1] - transformB.position[1];
    const dz = transformA.position[2] - transformB.position[2];

    return Math.sqrt(dx * dx + dy * dy + dz * dz) < condition.distance;
  });

  registry.register('custom.condition', (condition, state) => {
    if (condition.type !== 'custom.condition') {
      return false;
    }

    return registry.evaluateCustomCondition(condition.name, condition.params ?? {}, state);
  });

  return registry;
}
