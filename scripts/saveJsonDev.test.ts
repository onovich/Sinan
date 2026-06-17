import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveDataWritePath, writeJsonToDataPath } from './saveJsonDev';

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
        path: 'data/levels/level_01.json',
        data: { id: 'level_01' },
      });

      await expect(readFile(target, 'utf8')).resolves.toBe('{\n  "id": "level_01"\n}\n');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
