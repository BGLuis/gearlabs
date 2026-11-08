import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import type { CatalogIndex } from '@/types/silentgear';
import {
  appendIndexEntry,
  compareVersionIds,
  isCatalogIndex,
  isValidVersionId,
  parseVersionKey,
  LEGACY_ATM11_VERSION,
} from './catalog-index';
import { ATM11_DIR, readAtm11Index } from '../../tests/helpers/atm11-catalog';
import { SCRIPT, TSX, sha1 as sha1Of, buildInstance } from '../../tests/helpers/catalog-instance';

const sha1 = sha1Of;
const entry = (id: string, sha = 'a'.repeat(40)) => ({ id, folder: id, minecraft: '26.1.2', sha1: sha });

describe('published index.json', () => {
  const index = readAtm11Index();

  it('registers the SHA-1 of every published catalog.json', () => {
    expect(index.versions.length).toBeGreaterThan(0);
    for (const v of index.versions) {
      const file = path.join(ATM11_DIR, v.folder, 'catalog.json');
      expect(sha1(fs.readFileSync(file)), `${v.id}`).toBe(v.sha1);
    }
  });

  it('has a latest that is one of the versions, and one folder per version', () => {
    expect(index.versions.map((v) => v.id)).toContain(index.latest);
    for (const v of index.versions) expect(v.folder).toBe(v.id);
    const dirs = fs.readdirSync(ATM11_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    expect(dirs.sort()).toEqual(index.versions.map((v) => v.folder).sort());
  });

  it('keeps 0.11.1-beta byte-identical to the atm11/catalog.json of d8b2fb5', () => {
    const v = index.versions.find((x) => x.id === LEGACY_ATM11_VERSION)!;
    expect(v.sha1).toBe('8a3b6377fa815566025014303fad716b9fe993d2');
  });
});

describe('version ids', () => {
  it('compares major.minor.patch numerically and ignores the suffix', () => {
    expect(compareVersionIds('0.14.0-beta', '0.9.0-beta')).toBeGreaterThan(0);
    expect(compareVersionIds('0.11.1-beta', '0.12.0-beta')).toBeLessThan(0);
    expect(compareVersionIds('0.11.1-beta', '0.11.1')).toBe(0);
  });

  it('rejects ids that could leave the atm11 folder', () => {
    for (const bad of ['', '..', '../x', 'a/b', 'a\\b', '.hidden', 'x y', '0.1.0\n']) {
      expect(isValidVersionId(bad), JSON.stringify(bad)).toBe(false);
    }
    expect(isValidVersionId('0.14.0-beta')).toBe(true);
  });

  it('only splits the versioned preset, so other presets keep any @ they contain', () => {
    expect(parseVersionKey('1.21.1@foo')).toEqual({ preset: '1.21.1@foo' });
  });

  it('splits a version key into preset and pack version', () => {
    expect(parseVersionKey('atm11')).toEqual({ preset: 'atm11' });
    expect(parseVersionKey('atm11@0.14.0-beta')).toEqual({ preset: 'atm11', pack: '0.14.0-beta' });
    expect(parseVersionKey('1.21.1')).toEqual({ preset: '1.21.1' });
  });
});

describe('isCatalogIndex', () => {
  it('accepts a well-formed index and rejects broken ones', () => {
    expect(isCatalogIndex({ latest: 'a', versions: [entry('a')] })).toBe(true);
    expect(isCatalogIndex(null)).toBe(false);
    expect(isCatalogIndex({ latest: 'a' })).toBe(false);
    expect(isCatalogIndex({ latest: 'b', versions: [entry('a')] })).toBe(false);
  });
});

describe('appendIndexEntry', () => {
  const base: CatalogIndex = { latest: '0.11.1-beta', versions: [entry('0.11.1-beta')] };

  it('creates the index for the first version', () => {
    expect(appendIndexEntry(null, entry('0.14.0-beta'))).toEqual({
      latest: '0.14.0-beta',
      versions: [entry('0.14.0-beta')],
    });
  });

  it('puts a newer version first and makes it latest', () => {
    const next = appendIndexEntry(base, entry('0.14.0-beta'));
    expect(next.versions.map((v) => v.id)).toEqual(['0.14.0-beta', '0.11.1-beta']);
    expect(next.latest).toBe('0.14.0-beta');
  });

  it('puts an older version in its place and keeps latest', () => {
    const two = appendIndexEntry(base, entry('0.14.0-beta'));
    const next = appendIndexEntry(two, entry('0.12.0-beta'));
    expect(next.versions.map((v) => v.id)).toEqual(['0.14.0-beta', '0.12.0-beta', '0.11.1-beta']);
    expect(next.latest).toBe('0.14.0-beta');
  });

  it('refuses a version that is already registered', () => {
    expect(() => appendIndexEntry(base, entry('0.11.1-beta'))).toThrow(/0\.11\.1-beta/);
  });

  it('does not mutate its input', () => {
    const copy = JSON.stringify(base);
    appendIndexEntry(base, entry('0.14.0-beta'));
    expect(JSON.stringify(base)).toBe(copy);
  });
});

describe('extractor publishes immutable version folders', () => {
  const tmpDirs: string[] = [];
  afterEach(() => {
    while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
  });

  function snapshot(dir: string): Record<string, string> {
    const out: Record<string, string> = {};
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else out[path.relative(dir, p)] = sha1(fs.readFileSync(p));
      }
    };
    walk(dir);
    return out;
  }

  async function run(extraArgs: string[] = [], seed?: (out: string) => void) {
    const root = await buildInstance();
    tmpDirs.push(root);
    const out = path.join(root, 'out');
    seed?.(out);
    const result = spawnSync(TSX, [SCRIPT, '--instance', root, '--out', out, ...extraArgs], { encoding: 'utf-8' });
    return { out, result };
  }

  it('writes atm11/<pack version>/catalog.json and registers it in index.json', async () => {
    const { out, result } = await run();
    expect(result.status).toBe(0);
    const file = path.join(out, 'atm11/0.14.0-beta/catalog.json');
    expect(fs.existsSync(path.join(out, 'atm11/catalog.json'))).toBe(false);
    const index = JSON.parse(fs.readFileSync(path.join(out, 'atm11/index.json'), 'utf-8')) as CatalogIndex;
    expect(index.latest).toBe('0.14.0-beta');
    expect(index.versions).toEqual([
      { id: '0.14.0-beta', folder: '0.14.0-beta', minecraft: '26.1.2', sha1: sha1(fs.readFileSync(file)) },
    ]);
    expect(fs.existsSync(path.join(out, '1.21.1/catalog.json'))).toBe(true);
  });

  it('puts the new version before an older one that was already published', async () => {
    const old: CatalogIndex = { latest: '0.11.1-beta', versions: [entry('0.11.1-beta')] };
    const { out, result } = await run([], (o) => {
      fs.mkdirSync(path.join(o, 'atm11/0.11.1-beta'), { recursive: true });
      fs.writeFileSync(path.join(o, 'atm11/0.11.1-beta/catalog.json'), '{}');
      fs.writeFileSync(path.join(o, 'atm11/index.json'), JSON.stringify(old));
    });
    expect(result.status).toBe(0);
    const index = JSON.parse(fs.readFileSync(path.join(out, 'atm11/index.json'), 'utf-8')) as CatalogIndex;
    expect(index.versions.map((v) => v.id)).toEqual(['0.14.0-beta', '0.11.1-beta']);
    expect(index.latest).toBe('0.14.0-beta');
  });

  it('exits non-zero when the version folder already exists and leaves everything byte-identical', async () => {
    const root = await buildInstance();
    tmpDirs.push(root);
    const out = path.join(root, 'out');
    const args = [SCRIPT, '--instance', root, '--out', out];
    expect(spawnSync(TSX, args, { encoding: 'utf-8' }).status).toBe(0);
    const before = snapshot(out);

    const again = spawnSync(TSX, args, { encoding: 'utf-8' });
    expect(again.status).not.toBe(0);
    expect(again.stderr).toContain('0.14.0-beta');
    expect(snapshot(out)).toEqual(before);
  });

  it('refuses a pre-existing folder even when index.json does not list it', async () => {
    const { out, result } = await run([], (o) => {
      fs.mkdirSync(path.join(o, 'atm11/0.14.0-beta'), { recursive: true });
      fs.writeFileSync(path.join(o, 'atm11/0.14.0-beta/catalog.json'), 'precious');
    });
    expect(result.status).not.toBe(0);
    expect(fs.readFileSync(path.join(out, 'atm11/0.14.0-beta/catalog.json'), 'utf-8')).toBe('precious');
    expect(fs.existsSync(path.join(out, 'atm11/index.json'))).toBe(false);
    expect(fs.existsSync(path.join(out, '1.21.1'))).toBe(false);
  });
});
