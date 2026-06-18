import { describe, expect, it } from 'vitest';

import { PaletteSchema } from './palette.schema';

describe('palette schemas', () => {
  it('parses Git-friendly named color palettes', () => {
    expect(
      PaletteSchema.parse({
        schemaVersion: 1,
        id: 'world_01',
        tones: {
          base: '#76b28b',
          accent: '#5aa7d6',
          warm: '#d6a15a',
        },
      }),
    ).toEqual({
      schemaVersion: 1,
      id: 'world_01',
      tones: {
        base: '#76b28b',
        accent: '#5aa7d6',
        warm: '#d6a15a',
      },
    });
  });

  it('rejects empty palettes, unstable ids, invalid colors, and undeclared fields', () => {
    expect(
      PaletteSchema.safeParse({
        schemaVersion: 1,
        id: 'empty',
        tones: {},
      }).success,
    ).toBe(false);
    expect(
      PaletteSchema.safeParse({
        schemaVersion: 1,
        id: 'world 01',
        tones: { base: '#76b28b' },
      }).success,
    ).toBe(false);
    expect(
      PaletteSchema.safeParse({
        schemaVersion: 1,
        id: 'world_01',
        tones: { base: 'green' },
      }).success,
    ).toBe(false);
    expect(
      PaletteSchema.safeParse({
        schemaVersion: 1,
        id: 'world_01',
        tones: { base: '#76b28b' },
        textureAtlas: 'phase-17',
      }).success,
    ).toBe(false);
  });
});
