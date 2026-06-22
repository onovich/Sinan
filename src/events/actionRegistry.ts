import type { ActionData } from '../schemas/action.schema';
import type { DeliveryJobRuntimeResult } from '../game/delivery/DeliveryJobRuntime';
import { syncDeliveryJobRuntimeState, type ActionExecutionContext } from './types';

export type ActionSideEffect = 'none' | 'previewSafe' | 'runtimeOnly' | 'destructive';
export type ActionHandler = (action: ActionData, context: ActionExecutionContext) => void;
export type CustomActionHandler = (
  params: Readonly<Record<string, unknown>>,
  context: ActionExecutionContext,
) => void;

export interface ActionRegistrationOptions {
  sideEffect?: ActionSideEffect;
}

export class ActionRegistry {
  private readonly handlers = new Map<string, ActionHandler>();
  private readonly sideEffects = new Map<string, ActionSideEffect>();
  private readonly customFunctions = new Map<string, CustomActionHandler>();

  register(type: string, handler: ActionHandler, options: ActionRegistrationOptions = {}): void {
    this.handlers.set(type, handler);
    this.sideEffects.set(type, options.sideEffect ?? 'runtimeOnly');
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }

  types(): string[] {
    return Array.from(this.handlers.keys()).sort((left, right) => left.localeCompare(right));
  }

  registerCustomFunction(name: string, handler: CustomActionHandler): void {
    this.customFunctions.set(name, handler);
  }

  hasCustomFunction(name: string): boolean {
    return this.customFunctions.has(name);
  }

  customFunctionNames(): string[] {
    return Array.from(this.customFunctions.keys()).sort((left, right) => left.localeCompare(right));
  }

  dispatch(action: ActionData, context: ActionExecutionContext): void {
    const handler = this.handlers.get(action.type);

    if (!handler) {
      throw new Error(`Action type is not registered: ${action.type}`);
    }

    handler(action, context);
  }

  dispatchCustomFunction(
    name: string,
    params: Readonly<Record<string, unknown>>,
    context: ActionExecutionContext,
  ): void {
    const handler = this.customFunctions.get(name);

    if (!handler) {
      throw new Error(`Action function is not whitelisted: ${name}`);
    }

    handler(params, context);
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
        context.runtime?.setVisible?.(action.entityId, action.visible);
      }
    },
    { sideEffect: 'previewSafe' },
  );

  registry.register(
    'entity.setEnabled',
    (action, context) => {
      if (action.type === 'entity.setEnabled') {
        context.state.entityEnabled[action.entityId] = action.enabled;
      }
    },
    { sideEffect: 'previewSafe' },
  );

  registry.register(
    'entity.setTransform',
    (action, context) => {
      if (action.type === 'entity.setTransform') {
        context.state.entityTransforms[action.entityId] = action.transform;
        context.runtime?.setTransform?.(action.entityId, action.transform);
      }
    },
    { sideEffect: 'previewSafe' },
  );

  registry.register(
    'entity.animateTransform',
    (action, context) => {
      if (action.type === 'entity.animateTransform') {
        context.directorCommands.push({
          type: 'entity.animateTransform',
          entityId: action.entityId,
          to: action.to,
          duration: action.duration,
          ease: action.ease,
        });
      }
    },
    { sideEffect: 'runtimeOnly' },
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

  registry.register(
    'camera.playShot',
    (action, context) => {
      if (action.type === 'camera.playShot') {
        context.directorCommands.push({ type: 'camera.shot.play', shotId: action.shotId });
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'animation.play',
    (action, context) => {
      if (action.type === 'animation.play') {
        const command = {
          type: 'animation.play' as const,
          entityId: action.entityId,
          clip: action.clip,
          loop: action.loop,
          fadeIn: action.fadeIn,
          fadeOut: action.fadeOut,
        };

        if (context.runtime?.playAnimation) {
          context.runtime.playAnimation(command);
        } else {
          context.directorCommands.push(command);
        }
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'animation.stop',
    (action, context) => {
      if (action.type === 'animation.stop') {
        const command = {
          type: 'animation.stop' as const,
          entityId: action.entityId,
          clip: action.clip,
          fadeOut: action.fadeOut,
        };

        if (context.runtime?.stopAnimation) {
          context.runtime.stopAnimation(command);
        } else {
          context.directorCommands.push(command);
        }
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'sound.play',
    (action, context) => {
      if (action.type === 'sound.play') {
        context.directorCommands.push({ type: 'sound.play', soundId: action.soundId });
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'material.setParameter',
    (action, context) => {
      if (action.type === 'material.setParameter') {
        context.runtime?.setMaterialParameter?.({
          entityId: action.entityId,
          slot: action.slot,
          parameter: action.parameter,
          value: action.value,
        });
      }
    },
    { sideEffect: 'previewSafe' },
  );

  registry.register(
    'subtitle.show',
    (action, context) => {
      if (action.type === 'subtitle.show') {
        context.directorCommands.push({
          type: 'subtitle.show',
          text: action.text,
          duration: action.duration,
          speaker: action.speaker,
        });
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'delivery.accept',
    (action, context) => {
      if (action.type === 'delivery.accept') {
        const runtime = requireDeliveryJobRuntime(context, action.type);
        dispatchDeliveryJobResult(runtime.accept(action.jobId, action.endpointId), context);
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'delivery.progress',
    (action, context) => {
      if (action.type === 'delivery.progress') {
        const runtime = requireDeliveryJobRuntime(context, action.type);
        dispatchDeliveryJobResult(runtime.progress(action.jobId), context);
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'delivery.deliver',
    (action, context) => {
      if (action.type === 'delivery.deliver') {
        const runtime = requireDeliveryJobRuntime(context, action.type);
        dispatchDeliveryJobResult(runtime.readyToDeliver(action.jobId, action.endpointId), context);
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'delivery.complete',
    (action, context) => {
      if (action.type === 'delivery.complete') {
        const runtime = requireDeliveryJobRuntime(context, action.type);
        dispatchDeliveryJobResult(runtime.complete(action.jobId, action.endpointId), context);
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  registry.register(
    'function.call',
    (action, context) => {
      if (action.type === 'function.call') {
        registry.dispatchCustomFunction(action.name, action.params ?? {}, context);
      }
    },
    { sideEffect: 'runtimeOnly' },
  );

  return registry;
}

function requireDeliveryJobRuntime(
  context: ActionExecutionContext,
  actionType: string,
): NonNullable<ActionExecutionContext['deliveryJobs']> {
  if (!context.deliveryJobs) {
    throw new Error(`Delivery job runtime is required for action type: ${actionType}`);
  }

  return context.deliveryJobs;
}

function dispatchDeliveryJobResult(
  result: DeliveryJobRuntimeResult,
  context: ActionExecutionContext,
): void {
  syncDeliveryJobRuntimeState(context.state, result.snapshot);

  if (!result.ok) {
    throw new Error(result.message);
  }
}
