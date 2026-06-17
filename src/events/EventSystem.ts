import type { EventData } from '../schemas/event.schema';
import type { TriggerData } from '../schemas/trigger.schema';
import { ActionSystem } from './ActionSystem';
import { ConditionSystem } from './ConditionSystem';
import type { ActionExecutionContext } from './types';

export class EventSystem {
  constructor(
    private readonly events: readonly EventData[],
    private readonly conditionSystem = new ConditionSystem(),
    private readonly actionSystem = new ActionSystem(),
  ) {}

  handleTrigger(trigger: TriggerData, context: ActionExecutionContext): string[] {
    const firedEventIds: string[] = [];

    for (const event of this.events) {
      if (!triggerMatches(event.trigger, trigger)) {
        continue;
      }

      if (!this.conditionSystem.evaluate(event.condition, context.state)) {
        continue;
      }

      this.actionSystem.dispatchAll(event.actions, context);
      firedEventIds.push(event.id);
    }

    return firedEventIds;
  }
}

function triggerMatches(expected: TriggerData, actual: TriggerData): boolean {
  if (expected.type !== actual.type) {
    return false;
  }

  switch (expected.type) {
    case 'entity.interact':
      return actual.type === 'entity.interact' && expected.entityId === actual.entityId;
    case 'trigger.enter':
    case 'trigger.exit':
      return (
        (actual.type === 'trigger.enter' || actual.type === 'trigger.exit') &&
        expected.triggerId === actual.triggerId &&
        (expected.entityId === undefined || expected.entityId === actual.entityId)
      );
    case 'timeline.finished':
      return actual.type === 'timeline.finished' && expected.timelineId === actual.timelineId;
    case 'action.completed':
      return actual.type === 'action.completed' && expected.actionId === actual.actionId;
    case 'flag.changed':
      return actual.type === 'flag.changed' && expected.flag === actual.flag;
    case 'level.start':
      return true;
  }
}
