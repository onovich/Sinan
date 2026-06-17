import { describe, expect, it } from 'vitest';

import { parseKnownComponentPayload } from './component.schema';

describe('component schemas', () => {
  it('parses known authoring component payloads', () => {
    expect(parseKnownComponentPayload('Renderable', { model: 'model.switch_wall' })?.success).toBe(
      true,
    );
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
      parseKnownComponentPayload('Collider', {
        shape: 'aabb',
        center: [0, 0],
        size: [1, 1, 1],
      })?.success,
    ).toBe(false);
    expect(parseKnownComponentPayload('Unknown', { any: 'payload' })).toBeUndefined();
  });
});
