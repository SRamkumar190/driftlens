// @vitest-environment node

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

describe('create-spa-fallback', () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    temporaryDirectories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true }));
  });

  it('copies the built app shell to the static review route', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'driftlens-fallback-'));
    temporaryDirectories.push(workspace);
    mkdirSync(join(workspace, 'dist'));
    writeFileSync(join(workspace, 'dist', 'index.html'), '<main>DriftLens</main>');

    const result = spawnSync(process.execPath, [resolve('scripts/create-spa-fallback.mjs')], {
      cwd: workspace,
      encoding: 'utf8',
    });

    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(workspace, 'dist', 'review', 'index.html'), 'utf8'))
      .toBe('<main>DriftLens</main>');
  });
});
