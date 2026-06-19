export const ENGINE_MODES = ['edit', 'play', 'preview', 'showcase'] as const;

export type EngineMode = (typeof ENGINE_MODES)[number];

export function isEngineMode(value: unknown): value is EngineMode {
  return typeof value === 'string' && ENGINE_MODES.includes(value as EngineMode);
}
