import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import JSZip from 'jszip';
import { extractFromInstance, readInstanceProvenance } from '../scripts/extract-official-data';

const FIXTURE = path.resolve(__dirname, 'fixtures/catalog-source-instance');
const SCRIPT = path.resolve(__dirname, '../scripts/extract-official-data.ts');
const TSX = path.resolve(__dirname, '../node_modules/.bin/tsx');
const SILENT_GEAR_JAR = 'silent-gear-26.1.2-neoforge-4.2.3.jar';
const METALWORKS_JAR = 'sgearmetalworks-26.1.2-1.6.0.jar';
const KUBEJS_SCRIPT = 'minecraft/kubejs/dynamic_data/silentgear/silentgear_materials/allthemodium.json';

const tmpDirs: string[] = [];
afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

const sha1 = (data: Buffer) => createHash('sha1').update(data).digest('hex');

function addDir(zip: JSZip, dir: string, prefix = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix + entry.name;
    if (entry.isDirectory()) addDir(zip, path.join(dir, entry.name), rel + '/');
    else zip.file(rel, fs.readFileSync(path.join(dir, entry.name)), { date: new Date(0) });
  }
}

async function buildInstance(opts: { jarComment?: Record<string, string>; skipManifest?: boolean; skipCfg?: boolean } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-source-'));
  tmpDirs.push(root);
  fs.cpSync(path.join(FIXTURE, 'flame'), path.join(root, 'flame'), { recursive: true });
  fs.cpSync(path.join(FIXTURE, 'instance.cfg'), path.join(root, 'instance.cfg'));
  fs.cpSync(path.join(FIXTURE, 'minecraft/kubejs'), path.join(root, 'minecraft/kubejs'), { recursive: true });
  if (opts.skipManifest) fs.rmSync(path.join(root, 'flame'), { recursive: true });
  if (opts.skipCfg) fs.rmSync(path.join(root, 'instance.cfg'));
  const mods = path.join(root, 'minecraft/mods');
  fs.mkdirSync(mods, { recursive: true });
  for (const jar of [SILENT_GEAR_JAR, METALWORKS_JAR]) {
    const zip = new JSZip();
    addDir(zip, path.join(FIXTURE, 'jar-src', jar));
    const bytes = await zip.generateAsync({ type: 'nodebuffer', comment: opts.jarComment?.[jar] ?? 'x' });
    fs.writeFileSync(path.join(mods, jar), bytes);
  }
  return root;
}

const NOW = () => new Date('2026-11-07T12:00:00Z');

describe('catalog source (#94)', () => {
  it('records pack, minecraft, loader and the sha1 of every file read', async () => {
    const root = await buildInstance();
    const { source } = await extractFromInstance(root, { now: NOW });

    expect(source.pack).toEqual({
      name: 'All the Mods 11',
      version: '0.14.0-beta',
      curseforgeProjectId: 1148445,
      curseforgeFileId: 9343763,
    });
    expect(source.minecraft).toBe('26.1.2');
    expect(source.loader).toBe('neoforge-26.1.2.124');
    expect(source.extractedAt).toMatch(/^2026-11-0[78]T\d\d:00:00[+-]\d\d:\d\d$|Z$/);
    expect(new Date(source.extractedAt).getTime()).toBe(NOW().getTime());

    const read = (rel: string) => sha1(fs.readFileSync(path.join(root, rel)));
    expect(source.files).toEqual([
      { path: `minecraft/kubejs/dynamic_data/silentgear/silentgear_materials/allthemodium.json`, kind: 'script-data', sha1: read(KUBEJS_SCRIPT) },
      { path: `minecraft/mods/${METALWORKS_JAR}`, kind: 'jar', modId: 'sgearmetalworks', version: '1.6.0', sha1: read(`minecraft/mods/${METALWORKS_JAR}`) },
      { path: `minecraft/mods/${SILENT_GEAR_JAR}`, kind: 'jar', modId: 'silentgear', version: '4.2.3', sha1: read(`minecraft/mods/${SILENT_GEAR_JAR}`) },
    ]);
  });

  it('accepts the minecraft/ folder as the instance path too', async () => {
    const root = await buildInstance();
    const { source } = await extractFromInstance(path.join(root, 'minecraft'), { now: NOW });
    expect(source.pack.version).toBe('0.14.0-beta');
  });

  it('changing one byte of a jar changes only that jar sha1', async () => {
    const a = await extractFromInstance(await buildInstance(), { now: NOW });
    const b = await extractFromInstance(await buildInstance({ jarComment: { [METALWORKS_JAR]: 'y' } }), { now: NOW });
    const diff = a.source.files.filter((f, i) => f.sha1 !== b.source.files[i].sha1).map((f) => f.path);
    expect(diff).toEqual([`minecraft/mods/${METALWORKS_JAR}`]);
  });

  it('warns and keeps the real hash when a jar differs from the Prism .index', async () => {
    const root = await buildInstance();
    const index = path.join(root, 'minecraft/mods/.index');
    fs.mkdirSync(index);
    fs.writeFileSync(
      path.join(index, 'silent-gear.pw.toml'),
      `filename = '${SILENT_GEAR_JAR}'\n\n[download]\nhash = 'f0e1d83ebb243990ffa3ceac22f807b016364fdf'\nhash-format = 'sha1'\n`
    );
    const warnings: string[] = [];
    const { source } = await extractFromInstance(root, { now: NOW, warn: (m) => warnings.push(m) });
    const real = sha1(fs.readFileSync(path.join(root, 'minecraft/mods', SILENT_GEAR_JAR)));
    expect(source.files.find((f) => f.path.endsWith(SILENT_GEAR_JAR))!.sha1).toBe(real);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(SILENT_GEAR_JAR);
    expect(warnings[0]).toContain(real);
    expect(warnings[0]).toContain('f0e1d83ebb243990ffa3ceac22f807b016364fdf');
  });

  describe.each([
    ['flame/manifest.json', { skipManifest: true }],
    ['instance.cfg', { skipCfg: true }],
  ])('without %s', (missing, opts) => {
    it('names the searched path when reading provenance', async () => {
      const root = await buildInstance(opts);
      expect(() => readInstanceProvenance(root)).toThrow(path.join(root, missing));
    });

    it('exits non-zero and writes no catalog.json', async () => {
      const root = await buildInstance(opts);
      const out = path.join(root, 'out');
      const run = spawnSync(TSX, [SCRIPT, '--instance', root, '--out', out], { encoding: 'utf-8' });
      expect(run.status).not.toBe(0);
      expect(run.stderr).toContain(path.join(root, missing));
      expect(fs.existsSync(out)).toBe(false);
    });
  });

  it('fails when instance.cfg has no ManagedPackVersionID', async () => {
    const root = await buildInstance();
    fs.writeFileSync(path.join(root, 'instance.cfg'), 'ManagedPackID=1148445\n');
    expect(() => readInstanceProvenance(root)).toThrow(/ManagedPackVersionID/);
  });

  it('writes source into the atm11 catalog and no sourceCommit', async () => {
    const root = await buildInstance();
    const out = path.join(root, 'out');
    const run = spawnSync(TSX, [SCRIPT, '--instance', root, '--out', out], { encoding: 'utf-8' });
    expect(run.status).toBe(0);
    const atm11 = JSON.parse(fs.readFileSync(path.join(out, 'atm11/catalog.json'), 'utf-8'));
    expect(atm11.source.pack.version).toBe('0.14.0-beta');
    expect(atm11.source.files).toHaveLength(3);
    expect(atm11.sourceCommit).toBeUndefined();
    const official = JSON.parse(fs.readFileSync(path.join(out, '1.21.1/catalog.json'), 'utf-8'));
    expect(official.sourceCommit).toBeDefined();
    expect(official.source).toBeUndefined();
  });
});
