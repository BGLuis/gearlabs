import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import JSZip from 'jszip';
import type { CatalogSource } from '../src/types/silentgear';
import { extractFromInstance } from '../scripts/extract-official-data';
import { TSX, METALWORKS_JAR, SILENT_GEAR_JAR, tmpDirs, buildInstance } from './helpers/catalog-instance';

const SCRIPT = path.resolve(__dirname, '../scripts/check-updates.ts');
const REPO = path.resolve(__dirname, '..');
const NOW = () => new Date('2026-11-07T12:00:00Z');
const KUBEGROOVY_MATERIAL = 'minecraft/kubegroovy/dynamic_data/silentgear/silentgear_materials/vibranium.json';

afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

function tmp(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
}

/** Publica um catálogo `latest` com o `source` dado, no formato do índice da #96. */
function publish(source: CatalogSource | undefined, id = source?.pack.version ?? '0.14.0-beta'): string {
  const dir = tmp('check-updates-catalog-');
  fs.mkdirSync(path.join(dir, id));
  fs.writeFileSync(path.join(dir, id, 'catalog.json'), JSON.stringify({ version: 'atm11', ...(source && { source }) }));
  fs.writeFileSync(
    path.join(dir, 'index.json'),
    JSON.stringify({ latest: id, versions: [{ id, folder: id, minecraft: '26.1.2' }] })
  );
  return dir;
}

function check(instance: string, catalogDir: string | undefined, extra: string[] = []) {
  const args = [SCRIPT, ...(instance ? ['--instance', instance] : []), ...(catalogDir ? ['--catalog-dir', catalogDir] : []), ...extra];
  const run = spawnSync(TSX, args, { encoding: 'utf-8', cwd: REPO });
  return { code: run.status, out: run.stdout, err: run.stderr };
}

async function matchingSetup() {
  const root = await buildInstance();
  const { source } = await extractFromInstance(root, { now: NOW });
  return { root, source, catalogDir: publish(source) };
}

async function addJar(root: string, name: string, entries: Record<string, string>) {
  const zip = new JSZip();
  for (const [entry, body] of Object.entries(entries)) zip.file(entry, body, { date: new Date(0) });
  fs.writeFileSync(path.join(root, 'minecraft/mods', name), await zip.generateAsync({ type: 'nodebuffer' }));
}

function listing(dir: string): string[] {
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => {
      const file = path.join(e.parentPath, e.name);
      const stat = fs.statSync(file);
      return `${path.relative(dir, file)}:${stat.size}:${stat.mtimeMs}`;
    })
    .sort();
}

describe('check-updates (#97)', () => {
  it('exits 0 and prints "atualizado" when the instance matches the catalog source', async () => {
    const { root, catalogDir } = await matchingSetup();
    const run = check(root, catalogDir);
    expect(run.code).toBe(0);
    expect(run.out).toContain('atualizado');
  });

  it('accepts the minecraft/ folder as the instance path too', async () => {
    const { root, catalogDir } = await matchingSetup();
    const run = check(path.join(root, 'minecraft'), catalogDir);
    expect(run.code).toBe(0);
    expect(run.out).toContain('atualizado');
  });

  it('exits 2 and prints both pack versions when the pack version differs', async () => {
    const root = await buildInstance();
    const { source } = await extractFromInstance(root, { now: NOW });
    const old: CatalogSource = { ...source, pack: { ...source.pack, version: '0.11.1-beta' } };
    const run = check(root, publish(old));
    expect(run.code).toBe(2);
    expect(run.out).toContain('0.14.0-beta');
    expect(run.out).toContain('0.11.1-beta');
    expect(run.out).not.toContain('atualizado');
  });

  it('exits 2 and names the jar when the pack version is the same but a jar sha1 differs', async () => {
    const { root, catalogDir } = await matchingSetup();
    const other = await buildInstance({ jarComment: { [METALWORKS_JAR]: 'y' } });
    fs.copyFileSync(path.join(other, 'minecraft/mods', METALWORKS_JAR), path.join(root, 'minecraft/mods', METALWORKS_JAR));
    const run = check(root, catalogDir);
    expect(run.code).toBe(2);
    expect(run.out).toMatch(new RegExp(`alterado.*${METALWORKS_JAR.replace(/\./g, '\\.')}`));
    expect(run.out).not.toContain(SILENT_GEAR_JAR);
  });

  it('lists a new jar with silentgear_materials that is not in source.files as "novo"', async () => {
    const { root, catalogDir } = await matchingSetup();
    await addJar(root, 'newaddon-1.0.0.jar', { 'data/newaddon/silentgear_materials/shiny.json': '{}' });
    const run = check(root, catalogDir);
    expect(run.code).toBe(2);
    expect(run.out).toMatch(/novo.*newaddon-1\.0\.0\.jar/);
  });

  it('ignores a jar without silentgear_materials', async () => {
    const { root, catalogDir } = await matchingSetup();
    await addJar(root, 'unrelated-1.0.0.jar', { 'data/unrelated/recipes/x.json': '{}', 'data/unrelated/silentgear_traits/t.json': '{}' });
    const run = check(root, catalogDir);
    expect(run.code).toBe(0);
  });

  it('lists a new silentgear_materials script file under kubegroovy as "novo"', async () => {
    const { root, catalogDir } = await matchingSetup();
    const file = path.join(root, KUBEGROOVY_MATERIAL);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{}');
    const run = check(root, catalogDir);
    expect(run.code).toBe(2);
    expect(run.out).toMatch(/novo.*kubegroovy\/dynamic_data\/silentgear\/silentgear_materials\/vibranium\.json/);
  });

  it('lists a source file that is gone as "removido", and a changed script as "alterado"', async () => {
    const { root, catalogDir } = await matchingSetup();
    fs.rmSync(path.join(root, 'minecraft/mods', METALWORKS_JAR));
    fs.appendFileSync(path.join(root, 'minecraft/kubejs/dynamic_data/silentgear/silentgear_materials/allthemodium.json'), ' ');
    const run = check(root, catalogDir);
    expect(run.code).toBe(2);
    expect(run.out).toMatch(new RegExp(`removido.*${METALWORKS_JAR.replace(/\./g, '\\.')}`));
    expect(run.out).toMatch(/alterado.*allthemodium\.json/);
  });

  it('warns and goes on when a jar cannot be read as a zip', async () => {
    const { root, catalogDir } = await matchingSetup();
    fs.writeFileSync(path.join(root, 'minecraft/mods/broken.jar'), 'not a zip at all');
    const run = check(root, catalogDir);
    expect(run.code).toBe(0);
    expect(run.err).toContain('broken.jar');
  });

  it('prints pack, minecraft and loader of both sides', async () => {
    const { root, catalogDir } = await matchingSetup();
    const run = check(root, catalogDir);
    expect(run.out).toContain('All the Mods 11');
    expect(run.out).toContain('26.1.2');
    expect(run.out).toContain('neoforge-26.1.2.124');
  });

  it('exits 1 pointing at extract-data when the latest catalog has no source', async () => {
    const root = await buildInstance();
    const run = check(root, publish(undefined, '0.11.1-beta'));
    expect(run.code).toBe(1);
    expect(run.err).toContain('extract-data');
  });

  it('exits 1 without --instance and when the instance has no manifest', async () => {
    const { catalogDir } = await matchingSetup();
    expect(check('', catalogDir).code).toBe(1);
    const root = await buildInstance({ skipManifest: true });
    expect(check(root, catalogDir).code).toBe(1);
  });

  it('writes nothing: the instance, the catalog folder and the repo stay the same', async () => {
    const { root, catalogDir } = await matchingSetup();
    await addJar(root, 'newaddon-1.0.0.jar', { 'data/newaddon/silentgear_materials/shiny.json': '{}' });
    const git = () => spawnSync('git', ['status', '--porcelain'], { cwd: REPO, encoding: 'utf-8' }).stdout;
    const before = { instance: listing(root), catalog: listing(catalogDir), git: git() };
    expect(check(root, catalogDir).code).toBe(2);
    expect({ instance: listing(root), catalog: listing(catalogDir), git: git() }).toEqual(before);
  });
});
