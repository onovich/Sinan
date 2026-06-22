import { describe, expect, it } from 'vitest';

import { parseKnownComponentPayload } from './component.schema';

describe('component schemas', () => {
  it('parses known authoring component payloads', () => {
    expect(parseKnownComponentPayload('Renderable', { model: 'model.switch_wall' })?.success).toBe(
      true,
    );
    expect(
      parseKnownComponentPayload('Renderable', {
        model: 'model.switch_wall',
        renderStyle: {
          profile: 'palette-toon',
          palette: 'world_01',
          tone: 'accent',
          outline: 'interactable',
          highlight: 'selected',
        },
      })?.success,
    ).toBe(true);
    expect(
      parseKnownComponentPayload('Renderable', {
        model: 'model.switch_wall',
        materials: {
          main: {
            materialId: 'debug.uv-gradient',
            parameters: {
              baseColor: '#87c5ff',
              enabled: true,
              noiseMap: 'texture.noise',
              strength: 0.65,
              uvScale: [1, 1],
            },
          },
        },
      })?.success,
    ).toBe(true);
    expect(
      parseKnownComponentPayload('Door', {
        locked: true,
        requiredKey: 'gate_key',
        openAngle: 95,
        openDuration: 0.45,
      })?.success,
    ).toBe(true);
    expect(parseKnownComponentPayload('Switch', { initialState: false })?.success).toBe(true);
    expect(parseKnownComponentPayload('Interactable', { prompt: 'Press E' })?.success).toBe(true);
    expect(
      parseKnownComponentPayload('DeliveryEndpoint', {
        endpointId: 'delivery.courier_hill',
        kind: 'npc',
        label: 'Hill Courier',
        interactionRadius: 1.6,
        prompt: 'Accept parcel',
      })?.success,
    ).toBe(true);
    expect(
      parseKnownComponentPayload('Collider', {
        shape: 'aabb',
        center: [0, 1, 0],
        size: [2, 2, 2],
        isTrigger: true,
        debugColor: '#76b28b',
      })?.success,
    ).toBe(true);
    expect(parseKnownComponentPayload('TriggerZone', { enabled: true })?.success).toBe(true);
  });

  it('rejects invalid known component payloads', () => {
    expect(parseKnownComponentPayload('Door', { locked: true, openAngle: 270 })?.success).toBe(
      false,
    );
    expect(
      parseKnownComponentPayload('Renderable', {
        model: 'model.switch_wall',
        renderStyle: {
          profile: 'shader-graph',
        },
      })?.success,
    ).toBe(false);
    expect(
      parseKnownComponentPayload('Renderable', {
        model: 'model.switch_wall',
        materials: {
          'main slot': {
            materialId: 'debug.uv-gradient',
          },
        },
      })?.success,
    ).toBe(false);
    expect(
      parseKnownComponentPayload('Renderable', {
        model: 'model.switch_wall',
        materials: {
          main: {
            materialId: 'Debug.UV',
          },
        },
      })?.success,
    ).toBe(false);
    expect(
      parseKnownComponentPayload('Renderable', {
        model: 'model.switch_wall',
        materials: {
          main: {
            materialId: 'debug.uv-gradient',
            parameters: {
              uProgress: 0,
            },
          },
        },
      })?.success,
    ).toBe(false);
    expect(
      parseKnownComponentPayload('Renderable', {
        model: 'model.switch_wall',
        materials: {
          main: {
            materialId: 'debug.uv-gradient',
            parameters: {
              offset: [1, 2, 3, 4],
            },
          },
        },
      })?.success,
    ).toBe(false);
    expect(
      parseKnownComponentPayload('Collider', {
        shape: 'aabb',
        center: [0, 0],
        size: [1, 1, 1],
      })?.success,
    ).toBe(false);
    expect(
      parseKnownComponentPayload('DeliveryEndpoint', {
        endpointId: 'delivery.courier_hill',
        kind: 'vendor',
        label: 'Hill Courier',
        interactionRadius: 0,
      })?.success,
    ).toBe(false);
    expect(parseKnownComponentPayload('Unknown', { any: 'payload' })).toBeUndefined();
  });
});
