import { describe, expect, it } from 'vitest';

import type { EntityData } from '../../schemas/entity.schema';
import type { LevelData } from '../../schemas/level.schema';
import type { TransformData } from '../../schemas/transform.schema';
import type { WorldProjectionData } from '../../schemas/worldProjection.schema';
import { World, type SurfaceMovementCommand, type SurfaceMovementOptions } from '../../world';
import {
  ShowcaseController,
  createShowcaseControllerSessionHost,
  mapShowcaseKeyToControl,
  type ShowcaseControllerHost,
  type ShowcaseInteractionCommand,
} from './ShowcaseController';

const identityTransform: TransformData = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

const worldProjection: WorldProjectionData = {
  type: 'cube-sphere',
  radius: 10,
  regions: [
    {
      face: 'front',
      id: 'city',
      label: 'City',
      localBounds: {
        center: [0, 0, 0],
        size: [4, 2, 4],
      },
      name: 'City Region',
    },
  ],
};

describe('showcase controller movement interaction', () => {
  it('maps fixed first-party keys to movement and interaction controls', () => {
    expect(mapShowcaseKeyToControl('KeyW')).toBe('moveForward');
    expect(mapShowcaseKeyToControl('ArrowDown')).toBe('moveBackward');
    expect(mapShowcaseKeyToControl('KeyA')).toBe('turnLeft');
    expect(mapShowcaseKeyToControl('ArrowRight')).toBe('turnRight');
    expect(mapShowcaseKeyToControl('KeyE')).toBe('interact');
    expect(mapShowcaseKeyToControl('Space')).toBe('interact');
    expect(mapShowcaseKeyToControl('KeyZ')).toBeUndefined();
  });

  it('translates held keyboard state into deterministic surface movement commands', () => {
    const harness = createHarness();
    const controller = new ShowcaseController({
      actorEntityId: 'player',
      host: harness.host,
      movementOptions: {
        moveSpeed: 2,
        turnSpeed: 3,
      },
    });

    controller.handleInput({ code: 'KeyW', type: 'keyDown' });
    controller.handleInput({ code: 'KeyD', type: 'keyDown' });
    const result = controller.step(0.25);

    expect(harness.movementCommands).toEqual([
      {
        command: {
          deltaSeconds: 0.25,
          forward: 1,
          turn: 1,
        },
        entityId: 'player',
        options: {
          moveSpeed: 2,
          turnSpeed: 3,
        },
      },
    ]);
    expect(result.movement).toMatchObject({
      ok: true,
      state: {
        regionId: 'city',
      },
    });
    expect(result.snapshot.heldControls).toEqual(['moveForward', 'turnRight']);
  });

  it('dispatches interaction commands through the nearest endpoint solver', () => {
    const harness = createHarness({
      entities: [
        createPlayer(),
        createEndpoint('near_mailbox', {
          endpointId: 'delivery.near',
          localPosition: [0.1, 0, 0],
          radius: 8,
        }),
      ],
    });
    const controller = new ShowcaseController({
      actorEntityId: 'player',
      host: harness.host,
    });

    controller.handleInput({ code: 'KeyE', type: 'keyDown' });
    controller.handleInput({ code: 'KeyE', repeat: true, type: 'keyDown' });
    const result = controller.step(0.016);

    expect(harness.interactions).toHaveLength(1);
    expect(result.interaction).toMatchObject({
      actorEntityId: 'player',
      candidate: {
        deliveryEndpoint: {
          endpointId: 'delivery.near',
        },
        entityId: 'near_mailbox',
        kind: 'deliveryEndpoint',
      },
      sequence: 1,
    });
    expect(result.snapshot.pendingInteraction).toBe(false);
  });

  it('ignores movement and interaction while disabled for edit mode', () => {
    const harness = createHarness();
    const controller = new ShowcaseController({
      actorEntityId: 'player',
      enabled: false,
      host: harness.host,
    });

    controller.handleInput({ code: 'KeyW', type: 'keyDown' });
    controller.handleInput({ button: 0, type: 'pointerDown' });
    controller.step(1);
    controller.setEnabled(true);
    controller.step(1);

    expect(harness.movementCommands).toEqual([]);
    expect(harness.interactions).toEqual([]);
    expect(controller.getSnapshot()).toMatchObject({
      enabled: true,
      heldControls: [],
      pendingInteraction: false,
    });
  });

  it('clears held controls and pending interactions on browser focus loss', () => {
    const harness = createHarness();
    const controller = new ShowcaseController({
      actorEntityId: 'player',
      host: harness.host,
    });

    controller.handleInput({ code: 'KeyW', type: 'keyDown' });
    controller.step(0.5);
    controller.handleInput({ button: 0, type: 'pointerDown' });
    controller.handleInput({ type: 'blur' });
    controller.step(0.5);
    controller.handleInput({ type: 'focus' });
    controller.step(0.5);

    expect(harness.movementCommands).toHaveLength(1);
    expect(harness.interactions).toEqual([]);
    expect(controller.getSnapshot()).toMatchObject({
      focused: true,
      heldControls: [],
      pendingInteraction: false,
    });
  });

  it('supports explicit reset for smoke and runtime reload boundaries', () => {
    const harness = createHarness();
    const controller = new ShowcaseController({
      actorEntityId: 'player',
      host: harness.host,
    });

    controller.handleInput({ code: 'KeyW', type: 'keyDown' });
    controller.handleInput({ button: 0, type: 'pointerDown' });
    const resetResult = controller.executeSmokeCommand({ type: 'reset' });
    controller.step(1);

    expect(resetResult.snapshot).toMatchObject({
      heldControls: [],
      pendingInteraction: false,
    });
    expect(harness.movementCommands).toEqual([]);
    expect(harness.interactions).toEqual([]);
  });

  it('normalizes smoke movement commands and dispatches smoke interactions', () => {
    const harness = createHarness({
      entities: [
        createPlayer(),
        createEndpoint('near_mailbox', {
          endpointId: 'delivery.near',
          localPosition: [0.1, 0, 0],
          radius: 20,
        }),
      ],
    });
    const controller = new ShowcaseController({
      actorEntityId: 'player',
      host: harness.host,
    });

    const moveResult = controller.executeSmokeCommand({
      deltaSeconds: 1,
      forward: 42,
      turn: -42,
      type: 'move',
    });
    const interactResult = controller.executeSmokeCommand({ type: 'interact' });

    expect(harness.movementCommands[0]).toMatchObject({
      command: {
        deltaSeconds: 1,
        forward: 1,
        turn: -1,
      },
    });
    expect(moveResult.movement).toMatchObject({ ok: true });
    expect(interactResult.interaction).toMatchObject({
      candidate: {
        entityId: 'near_mailbox',
      },
      sequence: 1,
    });
    expect(harness.interactions).toHaveLength(1);
  });

  it('ignores text-editing keydown while still releasing stale held keys', () => {
    const harness = createHarness();
    const controller = new ShowcaseController({
      actorEntityId: 'player',
      host: harness.host,
    });

    controller.handleInput({ code: 'KeyW', type: 'keyDown' });
    controller.handleInput({ code: 'KeyS', targetEditable: true, type: 'keyDown' });
    controller.handleInput({ code: 'KeyW', targetEditable: true, type: 'keyUp' });
    controller.step(1);

    expect(harness.movementCommands).toEqual([]);
    expect(controller.getSnapshot().heldControls).toEqual([]);
  });

  it('provides a structural EngineSession host without importing engine runtime details', () => {
    const harness = createHarness();
    const host = createShowcaseControllerSessionHost({
      onInteractionCommand: (command) => harness.interactions.push(command),
      session: {
        getWorld: () => harness.world,
        stepSphericalMovement: (entityId, command, options) =>
          harness.host.stepMovement(entityId, command, options),
      },
    });

    host.stepMovement(
      'player',
      {
        deltaSeconds: 1,
        forward: 1,
        turn: 0,
      },
      {
        moveSpeed: 1,
      },
    );
    host.onInteractionCommand?.({
      actorEntityId: 'player',
      result: {
        actorEntityId: 'player',
        issues: [],
        message: 'No world is loaded for showcase interaction.',
        ok: false,
        reason: 'world_unloaded',
      },
      sequence: 1,
    });

    expect(harness.movementCommands).toHaveLength(1);
    expect(harness.interactions).toHaveLength(1);
  });
});

interface Harness {
  host: ShowcaseControllerHost;
  interactions: ShowcaseInteractionCommand[];
  movementCommands: {
    command: SurfaceMovementCommand;
    entityId: string;
    options: SurfaceMovementOptions | undefined;
  }[];
  world: World;
}

function createHarness(options: { entities?: EntityData[] } = {}): Harness {
  const world = World.fromLevel(createLevel(options.entities ?? [createPlayer()]));
  const movementCommands: Harness['movementCommands'] = [];
  const interactions: ShowcaseInteractionCommand[] = [];
  const host: ShowcaseControllerHost = {
    getWorld: () => world,
    onInteractionCommand: (command) => {
      interactions.push(command);
    },
    stepMovement: (entityId, command, movementOptions) => {
      movementCommands.push({
        command,
        entityId,
        options: movementOptions,
      });

      return world.stepSphericalMovement(entityId, command, movementOptions);
    },
  };

  return {
    host,
    interactions,
    movementCommands,
    world,
  };
}

function createLevel(entities: EntityData[]): LevelData {
  return {
    cameraShots: [],
    entities,
    events: [],
    id: 'level_showcase_controller_test',
    name: 'Showcase Controller Test',
    schemaVersion: 1,
    timelines: [],
    worldProjection,
  };
}

function createPlayer(): EntityData {
  return {
    components: {
      PlayerSpawn: {
        kind: 'default',
      },
    },
    id: 'player',
    placement: {
      localPosition: [0, 0, 0],
      mode: 'spherical-region',
      region: 'city',
    },
    transform: identityTransform,
  };
}

function createEndpoint(
  id: string,
  options: {
    endpointId: string;
    localPosition: TransformData['position'];
    radius: number;
  },
): EntityData {
  return {
    components: {
      DeliveryEndpoint: {
        endpointId: options.endpointId,
        interactionRadius: options.radius,
        kind: 'mailbox',
        label: id,
      },
      Interactable: {
        prompt: 'Interact',
      },
    },
    id,
    placement: {
      localPosition: options.localPosition,
      mode: 'spherical-region',
      region: 'city',
    },
    transform: {
      ...identityTransform,
      position: options.localPosition,
    },
  };
}
