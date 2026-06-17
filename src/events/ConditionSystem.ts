import type { ConditionData } from '../schemas/condition.schema';
import { createDefaultConditionRegistry, type ConditionRegistry } from './conditionRegistry';
import type { EventRuntimeState } from './types';

export class ConditionSystem {
  constructor(private readonly registry: ConditionRegistry = createDefaultConditionRegistry()) {}

  evaluate(condition: ConditionData | undefined, state: EventRuntimeState): boolean {
    if (!condition) {
      return true;
    }

    if ('all' in condition) {
      return condition.all.every((child) => this.evaluate(child, state));
    }

    if ('any' in condition) {
      return condition.any.some((child) => this.evaluate(child, state));
    }

    if ('not' in condition) {
      return !this.evaluate(condition.not, state);
    }

    return this.registry.evaluate(condition, state);
  }
}
