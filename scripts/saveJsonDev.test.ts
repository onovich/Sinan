import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveDataWritePath, validateSaveJsonPayload, writeJsonToDataPath } from './saveJsonDev';

describe('saveJsonDev', () => {
  it('allows writes below data with json extension', () => {
    const root = path.join(os.tmpdir(), 'sinan-save-test');

    expect(resolveDataWritePath(root, 'data/levels/level_01.json')).toBe(
      path.resolve(root, 'data/levels/level_01.json'),
    );
  });

  it('rejects paths outside data', () => {
    const root = path.join(os.tmpdir(), 'sinan-save-test');

    expect(() => resolveDataWritePath(root, '../package.json')).toThrow();
    expect(() => resolveDataWritePath(root, 'src/App.tsx')).toThrow();
    expect(() => resolveDataWritePath(root, 'data/../package.json')).toThrow();
    expect(() => resolveDataWritePath(root, 'data/levels/level_01.txt')).toThrow();
  });

  it('writes pretty JSON to an allowed data path', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'sinan-save-test-'));

    try {
      const target = await writeJsonToDataPath(root, {
        path: 'data/assets.manifest.json',
        data: { schemaVersion: 1, assets: {} },
      });

      await expect(readFile(target, 'utf8')).resolves.toBe(
        '{\n  "schemaVersion": 1,\n  "assets": {}\n}\n',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects schema-invalid data before writing', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'sinan-save-test-'));
    const target = path.resolve(root, 'data/events/ev_bad.json');

    try {
      await expect(
        writeJsonToDataPath(root, {
          path: 'data/events/ev_bad.json',
          data: { schemaVersion: 1, id: 'ev_bad', actions: [] },
        }),
      ).rejects.toThrow('event validation');
      await expect(readFile(target, 'utf8')).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects data paths without a registered schema', () => {
    expect(() =>
      validateSaveJsonPayload({
        path: 'data/misc/unknown.json',
        data: { schemaVersion: 1 },
      }),
    ).toThrow('No save schema registered');
  });
});
