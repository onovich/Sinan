import { describe, expect, it } from 'vitest';

import { RenderStyleSchema } from './renderStyle.schema';

describe('render style schemas', () => {
  it('parses standard and palette-toon render styles as renderer-neutral data', () => {
    expect(RenderStyleSchema.parse({})).toEqual({ profile: 'standard' });

    expect(
      RenderStyleSchema.parse({
        profile: 'palette-toon',
        palette: 'world_01',
        tone: 'accent',
        outline: 'interactable',
        highlight: 'selected',
        fog: 'inherit',
        colorGrade: 'enabled',
      }),
    ).toEqual({
      profile: 'palette-toon',
      palette: 'world_01',
      tone: 'accent',
      outline: 'interactable',
      highlight: 'selected',
      fog: 'inherit',
      colorGrade: 'enabled',
    });
  });

  it('rejects unknown profiles, unstable ids, and undeclared fields', () => {
    expect(RenderStyleSchema.safeParse({ profile: 'shader-graph' }).success).toBe(false);
    expect(
      RenderStyleSchema.safeParse({
        profile: 'palette-toon',
        palette: 'world one',
      }).success,
    ).toBe(false);
    expect(
      RenderStyleSchema.safeParse({
        profile: 'standard',
        compressionBudget: 'phase-17',
      }).success,
    ).toBe(false);
  });
});
