import type { TriggerData } from '../schemas/trigger.schema';

export class TriggerRegistry {
  private readonly triggerTypes = new Set<string>();

  register(type: TriggerData['type']): void {
    this.triggerTypes.add(type);
  }

  has(type: TriggerData['type']): boolean {
    return this.triggerTypes.has(type);
  }
}

export function createDefaultTriggerRegistry(): TriggerRegistry {
  const registry = new TriggerRegistry();

  registry.register('entity.interact');
  registry.register('trigger.enter');
  registry.register('trigger.exit');
  registry.register('level.start');
  registry.register('timeline.finished');
  registry.register('action.completed');
  registry.register('flag.changed');

  return registry;
}
