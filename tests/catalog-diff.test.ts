import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import type { CatalogIndex, Material, VersionCatalog } from '../src/types/silentgear';
import {
  compareWithPrevious,
  diffCatalogs,
  findPreviousVersion,
  formatDiffReport,
  parseAllowRemoved,
  RemovalBlockedError,
} from '../scripts/catalog-diff';
import { SCRIPT, TSX, buildInstance, tmpDirs } from './helpers/catalog-instance';

afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

const ATM = 'silentgear:allthemodium';

function mat(id: string, over: Partial<Material> = {}): Material {
  return {
    id,
    name: { en: id, pt: id },
    tier: 4,
    category: 'metal',
    color: '#FFD700',
    stats: { main: { durability: 100 } as never },
    traits: {
      main: [
        { name: 'silentgear:malleable', level: 4 },
        { name: 'silentgear:crushing', level: 4 },
      ],
    },
    ...over,
  };
}

const catalog = (...materials: Material[]) => ({ materials: Object.fromEntries(materials.map((m) => [m.id, m])) });

describe('diffCatalogs', () => {
  it('lists a material missing from the new catalog as removed', () => {
    const diff = diffCatalogs(catalog(mat(ATM), mat('silentgear:iron')), catalog(mat('silentgear:iron')));
    expect(diff.removed).toEqual([ATM]);
    expect(diff.added).toEqual([]);
    expect(diff.changed).toEqual([]);
  });

  it('lists new materials as added', () => {
    expect(diffCatalogs(catalog(), catalog(mat('silentgear:iron'))).added).toEqual(['silentgear:iron']);
  });

  it('reports the material, slot and trait when a trait disappears from a slot', () => {
    const next = mat(ATM, { traits: { main: [{ name: 'silentgear:crushing', level: 4 }] } });
    const diff = diffCatalogs(catalog(mat(ATM)), catalog(next));
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].traits).toEqual([
      { slot: 'main', trait: 'silentgear:malleable', kind: 'removed', before: { name: 'silentgear:malleable', level: 4 } },
    ]);
    const report = formatDiffReport(diff, { previous: '0.11.1-beta', next: '0.14.0-beta' });
    expect(report).toMatch(/<code>silentgear:allthemodium<\/code>/);
    expect(report).toMatch(/trait `main` `silentgear:malleable`: removido/);
  });

  it('reports a trait level change and a repeated trait without swallowing either', () => {
    const prev = mat(ATM, { traits: { main: [{ name: 'a:t', level: 1 }, { name: 'a:t', level: 2 }] } });
    const next = mat(ATM, { traits: { main: [{ name: 'a:t', level: 3 }, { name: 'a:t', level: 2 }] } });
    const { changed } = diffCatalogs(catalog(prev), catalog(next));
    expect(changed[0].traits.map((t) => [t.trait, t.kind])).toEqual([['a:t', 'changed']]);
  });

  it('reports changed fields generically, including parent, categories and stats', () => {
    const next = mat(ATM, {
      parent: 'silentgear:iron',
      categories: ['metal'],
      color: '#000000',
      stats: { main: { durability: 150 } as never },
    });
    const { changed } = diffCatalogs(catalog(mat(ATM)), catalog(next));
    expect(changed[0].fields).toEqual([
      { path: 'categories', after: ['metal'] },
      { path: 'color', before: '#FFD700', after: '#000000' },
      { path: 'parent', after: 'silentgear:iron' },
      { path: 'stats.main.durability', before: 100, after: 150 },
    ]);
  });

  it('two equal catalogs report no changes', () => {
    const c = catalog(mat(ATM), mat('silentgear:iron'));
    const diff = diffCatalogs(c, structuredClone(c));
    expect(diff).toEqual({ added: [], removed: [], changed: [] });
    expect(formatDiffReport(diff, { previous: 'a', next: 'b' })).toMatch(/Sem mudanças/);
  });

  it('keeps the summary short when 131 materials changed', () => {
    const ids = Array.from({ length: 131 }, (_, i) => `silentgear:m${i}`);
    const prev = catalog(...ids.map((id) => mat(id)));
    const next = catalog(...ids.map((id) => mat(id, { tier: 5, color: '#111111', traits: { main: [] } })));
    const report = formatDiffReport(diffCatalogs(prev, next), { previous: 'a', next: 'b' });
    const summary = report.split('## Detalhes')[0];
    expect(summary.split('\n').length).toBeLessThan(131 + 20);
    expect(report.match(/<details>/g)).toHaveLength(131);
    expect(report.length).toBeLessThan(65536 * 2);
  });

  it('marks authorized removals in the report', () => {
    const diff = diffCatalogs(catalog(mat(ATM)), catalog());
    expect(formatDiffReport(diff, { previous: 'a', next: 'b', allowedRemoved: [ATM] })).toContain(`- \`${ATM}\` (autorizado)`);
  });
});

describe('findPreviousVersion', () => {
  const entry = (id: string) => ({ id, folder: id, minecraft: '26.1.2', sha1: 'x' });
  const index: CatalogIndex = { latest: '0.14.0-beta', versions: [entry('0.14.0-beta'), entry('0.11.1-beta'), entry('0.9.0-beta')] };

  it('takes the highest version below the new one', () => {
    expect(findPreviousVersion(index, '0.12.0-beta')?.id).toBe('0.11.1-beta');
    expect(findPreviousVersion(index, '0.15.0-beta')?.id).toBe('0.14.0-beta');
  });

  it('orders numerically, not as text', () => {
    expect(findPreviousVersion({ latest: '0.9.0-beta', versions: [entry('0.9.0-beta')] }, '0.10.0-beta')?.id).toBe('0.9.0-beta');
  });

  it('has no previous for the oldest version or without an index', () => {
    expect(findPreviousVersion(index, '0.8.0-beta')).toBeUndefined();
    expect(findPreviousVersion(null, '0.8.0-beta')).toBeUndefined();
  });
});

describe('parseAllowRemoved', () => {
  it('splits on commas and ignores blanks', () => {
    expect(parseAllowRemoved(`${ATM}, silentgear:iron,,`)).toEqual([ATM, 'silentgear:iron']);
    expect(parseAllowRemoved(undefined)).toEqual([]);
  });
});

describe('compareWithPrevious', () => {
  function publish(...materials: Material[]) {
    const dir = path.join(buildDirRoot(), 'atm11');
    fs.mkdirSync(path.join(dir, '0.11.1-beta'), { recursive: true });
    const cat: Partial<VersionCatalog> = catalog(mat('silentgear:iron'), ...materials);
    fs.writeFileSync(path.join(dir, '0.11.1-beta/catalog.json'), JSON.stringify(cat));
    const index: CatalogIndex = {
      latest: '0.11.1-beta',
      versions: [{ id: '0.11.1-beta', folder: '0.11.1-beta', minecraft: '26.1.2', sha1: 'x' }],
    };
    return { dir, index };
  }

  it('returns null when there is no previous version', () => {
    expect(compareWithPrevious('/nowhere', null, '0.14.0-beta', catalog(), [])).toBeNull();
  });

  it('blocks an unauthorized removal and names the id and the report', () => {
    const { dir, index } = publish(mat(ATM));
    expect(() => compareWithPrevious(dir, index, '0.14.0-beta', catalog(mat('silentgear:iron')), [])).toThrow(RemovalBlockedError);
    try {
      compareWithPrevious(dir, index, '0.14.0-beta', catalog(mat('silentgear:iron')), []);
    } catch (e) {
      expect((e as Error).message).toContain(ATM);
      expect((e as Error).message).toContain('# Diferenças do catálogo: 0.11.1-beta → 0.14.0-beta');
    }
  });

  it('lets an authorized removal through and lists it in the report', () => {
    const { dir, index } = publish(mat(ATM));
    const result = compareWithPrevious(dir, index, '0.14.0-beta', catalog(mat('silentgear:iron')), [ATM])!;
    expect(result.diff.removed).toEqual([ATM]);
    expect(result.report).toContain(`- \`${ATM}\` (autorizado)`);
  });

  it('refuses a previous catalog without materials instead of treating it as empty', () => {
    const { dir, index } = publish();
    fs.writeFileSync(path.join(dir, '0.11.1-beta/catalog.json'), '{}');
    expect(() => compareWithPrevious(dir, index, '0.14.0-beta', catalog(), [])).toThrow(/malformado/);
  });

  it('rejects an allowed id that was not removed', () => {
    const { dir, index } = publish();
    expect(() => compareWithPrevious(dir, index, '0.14.0-beta', catalog(mat('silentgear:iron')), [ATM])).toThrow(/não foram removidos: silentgear:allthemodium/);
  });

  it('rejects an allowed id when there is no previous version', () => {
    expect(() => compareWithPrevious('/nowhere', null, '0.14.0-beta', catalog(), [ATM])).toThrow(RemovalBlockedError);
  });
});

function buildDirRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-diff-'));
  tmpDirs.push(root);
  return root;
}

const GONE = 'silentgear:removed_metal';

describe('extractor CLI (#95)', () => {
  /** Publica 0.14.0-beta numa pasta, depois a recoloca como 0.11.1-beta com um material a mais. */
  async function seededOut() {
    const root = await buildInstance();
    const first = path.join(root, 'first');
    expect(spawnSync(TSX, [SCRIPT, '--instance', root, '--out', first], { encoding: 'utf-8' }).status).toBe(0);
    const out = path.join(root, 'out');
    const dir = path.join(out, 'atm11');
    fs.mkdirSync(path.join(dir, '0.11.1-beta'), { recursive: true });
    const published = JSON.parse(fs.readFileSync(path.join(first, 'atm11/0.14.0-beta/catalog.json'), 'utf-8')) as VersionCatalog;
    published.materials[GONE] = mat(GONE);
    const file = path.join(dir, '0.11.1-beta/catalog.json');
    fs.writeFileSync(file, JSON.stringify(published, null, 2));
    const index: CatalogIndex = {
      latest: '0.11.1-beta',
      versions: [{ id: '0.11.1-beta', folder: '0.11.1-beta', minecraft: '26.1.2', sha1: 'x' }],
    };
    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index));
    return { root, out, dir, file, snapshot: () => fs.readdirSync(out, { recursive: true }).map(String).sort() };
  }

  it('exits non-zero, names the id and leaves the previous catalog untouched on an unauthorized removal', async () => {
    const { root, out, file, snapshot } = await seededOut();
    const before = fs.readFileSync(file);
    const files = snapshot();
    const run = spawnSync(TSX, [SCRIPT, '--instance', root, '--out', out], { encoding: 'utf-8' });
    expect(run.status, run.stderr).not.toBe(0);
    expect(run.stderr).toContain(GONE);
    expect(fs.readFileSync(file).equals(before)).toBe(true);
    expect(snapshot()).toEqual(files);
  });

  it('with --allow-removed exits 0 and writes a report listing the removed id', async () => {
    const { root, out, dir } = await seededOut();
    const run = spawnSync(TSX, [SCRIPT, '--instance', root, '--out', out, '--allow-removed', GONE], { encoding: 'utf-8' });
    expect(run.status, run.stderr).toBe(0);
    const report = fs.readFileSync(path.join(dir, '0.14.0-beta/catalog.diff.md'), 'utf-8');
    expect(report).toContain(`- \`${GONE}\` (autorizado)`);
  });

  it('writes "sem mudanças" for an identical catalog and exits 0', async () => {
    const root = await buildInstance();
    const out = path.join(root, 'out');
    const first = path.join(root, 'first');
    expect(spawnSync(TSX, [SCRIPT, '--instance', root, '--out', first], { encoding: 'utf-8' }).status).toBe(0);
    fs.cpSync(path.join(first, 'atm11/0.14.0-beta'), path.join(out, 'atm11/0.11.1-beta'), { recursive: true });
    fs.writeFileSync(
      path.join(out, 'atm11/index.json'),
      JSON.stringify({ latest: '0.11.1-beta', versions: [{ id: '0.11.1-beta', folder: '0.11.1-beta', minecraft: '26.1.2', sha1: 'x' }] })
    );
    const run = spawnSync(TSX, [SCRIPT, '--instance', root, '--out', out], { encoding: 'utf-8' });
    expect(run.status).toBe(0);
    expect(fs.readFileSync(path.join(out, 'atm11/0.14.0-beta/catalog.diff.md'), 'utf-8')).toMatch(/Sem mudanças/);
  });
});
