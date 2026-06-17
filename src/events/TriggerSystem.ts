import type { EventSystem } from './EventSystem';
import type { ActionExecutionContext } from './types';

export class TriggerSystem {
  constructor(private readonly eventSystem: EventSystem) {}

  interact(entityId: string, context: ActionExecutionContext): string[] {
    return this.eventSystem.handleTrigger({ type: 'entity.interact', entityId }, context);
  }

  levelStart(context: ActionExecutionContext): string[] {
    return this.eventSystem.handleTrigger({ type: 'level.start' }, context);
  }

  timelineFinished(timelineId: string, context: ActionExecutionContext): string[] {
    return this.eventSystem.handleTrigger({ type: 'timeline.finished', timelineId }, context);
  }

  triggerEnter(
    triggerId: string,
    entityId: string | undefined,
    context: ActionExecutionContext,
  ): string[] {
    return this.eventSystem.handleTrigger({ type: 'trigger.enter', triggerId, entityId }, context);
  }

  triggerExit(
    triggerId: string,
    entityId: string | undefined,
    context: ActionExecutionContext,
  ): string[] {
    return this.eventSystem.handleTrigger({ type: 'trigger.exit', triggerId, entityId }, context);
  }
}
