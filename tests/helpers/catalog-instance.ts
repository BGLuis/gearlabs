import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createHash } from 'crypto';
import JSZip from 'jszip';

export const FIXTURE = path.resolve(__dirname, '../fixtures/catalog-source-instance');
export const SCRIPT = path.resolve(__dirname, '../../scripts/extract-official-data.ts');
export const TSX = path.resolve(__dirname, '../../node_modules/.bin/tsx');
export const SILENT_GEAR_JAR = 'silent-gear-26.1.2-neoforge-4.2.3.jar';
export const METALWORKS_JAR = 'sgearmetalworks-26.1.2-1.6.0.jar';
export const KUBEJS_SCRIPT = 'minecraft/kubejs/dynamic_data/silentgear/silentgear_materials/allthemodium.json';

export const tmpDirs: string[] = [];

export const sha1 = (data: Buffer) => createHash('sha1').update(data).digest('hex');

function addDir(zip: JSZip, dir: string, prefix = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix + entry.name;
    if (entry.isDirectory()) addDir(zip, path.join(dir, entry.name), rel + '/');
    else zip.file(rel, fs.readFileSync(path.join(dir, entry.name)), { date: new Date(0) });
  }
}

export async function buildInstance(opts: { jarComment?: Record<string, string>; skipManifest?: boolean; skipCfg?: boolean } = {}) {
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

