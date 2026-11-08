import * as fs from 'fs';
import * as path from 'path';
import type { CatalogSource } from '../src/types/silentgear';
import { loadLatestSource } from './check-remote';
import { findScriptRoots, isMaterialJar, parseMaterialFile } from './instance-layers';
import { InstanceProvenance, readInstanceProvenance, resolveInstanceDirs, sha1OfFile } from './lib/instance';
import { readZipEntryNames } from './lib/zip-entries';

/**
 * Compara a instância do Prism com o `source` do catálogo `latest` publicado, sem extrair nada
 * e sem gravar nada. Ver o #97.
 */

export interface InstanceDifferences {
  instance: InstanceProvenance;
  /** jar ou script com `silentgear_materials` que o catálogo não leu */
  added: string[];
  /** arquivo de `source.files` que não existe mais na instância */
  removed: string[];
  changed: Array<{ path: string; from: string; to: string }>;
  /** pack, Minecraft ou loader diferem do catálogo */
  provenanceDiffers: boolean;
}

const toPosix = (p: string) => p.split(path.sep).join('/');

function jarHasMaterials(file: string, warn: (message: string) => void): boolean {
  try {
    return isMaterialJar(readZipEntryNames(file));
  } catch (e) {
    warn(`[check-updates] ${path.basename(file)} ignorado: não consegui ler como zip (${e instanceof Error ? e.message : e})`);
    return false;
  }
}

/** Material de script que o extrator não consegue ler não entra em `source.files`: não é novo. */
function isReadableMaterial(file: string, warn: (message: string) => void): boolean {
  try {
    parseMaterialFile(file);
    return true;
  } catch (e) {
    warn(`[check-updates] ${path.basename(file)} ignorado: ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

function findNewFiles(root: string, gameDir: string, known: ReadonlySet<string>, warn: (m: string) => void): string[] {
  const modsDir = path.join(gameDir, 'mods');
  const jars = fs.existsSync(modsDir)
    ? fs.readdirSync(modsDir).filter((f) => f.endsWith('.jar')).map((f) => path.join(modsDir, f))
    : [];
  const candidates = [
    ...jars.filter((jar) => !known.has(toPosix(path.relative(root, jar)))).filter((jar) => jarHasMaterials(jar, warn)),
    ...findScriptRoots(gameDir)
      .flatMap((script) => script.materialFiles)
      .filter((file) => !known.has(toPosix(path.relative(root, file))))
      .filter((file) => isReadableMaterial(file, warn)),
  ];
  return candidates.map((file) => toPosix(path.relative(root, file))).sort();
}

export function compareInstance(
  source: CatalogSource,
  instancePath: string,
  warn: (message: string) => void = (message) => console.warn(message)
): InstanceDifferences {
  const instance = readInstanceProvenance(instancePath);
  const { root, gameDir } = resolveInstanceDirs(instancePath);

  const removed: string[] = [];
  const changed: InstanceDifferences['changed'] = [];
  for (const file of source.files) {
    const abs = path.join(root, file.path);
    if (!fs.existsSync(abs)) removed.push(file.path);
    else {
      const sha1 = sha1OfFile(abs);
      if (sha1 !== file.sha1) changed.push({ path: file.path, from: file.sha1, to: sha1 });
    }
  }

  const known = new Set(source.files.map((f) => f.path));
  return {
    instance,
    added: findNewFiles(root, gameDir, known, warn),
    removed,
    changed,
    provenanceDiffers:
      instance.pack.version !== source.pack.version ||
      instance.pack.name !== source.pack.name ||
      instance.minecraft !== source.minecraft ||
      instance.loader !== source.loader,
  };
}

export const isUpToDate = (d: InstanceDifferences) =>
  !d.provenanceDiffers && d.added.length + d.removed.length + d.changed.length === 0;

const describeProvenance = (p: { pack: { name: string; version: string }; minecraft: string; loader: string }) =>
  `${p.pack.name} ${p.pack.version} · minecraft ${p.minecraft} · ${p.loader}`;

export function formatReport(catalogId: string, source: CatalogSource, d: InstanceDifferences): string {
  const lines = [`Catálogo (latest ${catalogId}): ${describeProvenance(source)}`, `Instância: ${describeProvenance(d.instance)}`];
  if (isUpToDate(d)) return [...lines, 'atualizado'].join('\n');
  if (d.provenanceDiffers) lines.push('diferença: pack, Minecraft ou loader');
  for (const file of d.added) lines.push(`novo: ${file}`);
  for (const file of d.removed) lines.push(`removido: ${file}`);
  for (const c of d.changed) lines.push(`alterado: ${c.path} (catálogo ${c.from.slice(0, 7)} → instância ${c.to.slice(0, 7)})`);
  return lines.join('\n');
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function main(): number {
  const instancePath = arg('--instance');
  if (!instancePath) {
    throw new Error('uso: check-updates.ts --instance <pasta do Prism ou minecraft/> [--catalog-dir <pasta>]');
  }
  const catalogDir = path.resolve(arg('--catalog-dir') ?? 'public/data/versions/atm11');
  const { id, source } = loadLatestSource(
    catalogDir,
    'comparar a instância (gere um com `npm run extract-data -- --instance <caminho>`)'
  );
  const differences = compareInstance(source, path.resolve(instancePath));
  console.log(formatReport(id, source, differences));
  return isUpToDate(differences) ? 0 : 2;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (err) {
    console.error(`[check-updates] ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  }
}
