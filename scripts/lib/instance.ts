import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import type { CatalogSource } from '../../src/types/silentgear';

export interface InstanceProvenance {
  pack: CatalogSource['pack'];
  minecraft: string;
  loader: string;
}

// O caminho pode ser a raiz da instância do Prism (com `flame/`, `instance.cfg` e
// `minecraft/`) ou a própria pasta `minecraft/` (formato aceito antes do #94).
export function resolveInstanceDirs(instancePath: string): { root: string; gameDir: string } {
  const nested = path.join(instancePath, 'minecraft');
  return fs.existsSync(nested)
    ? { root: instancePath, gameDir: nested }
    : { root: path.dirname(instancePath), gameDir: instancePath };
}

export function readRequiredFile(file: string, what: string): string {
  if (!fs.existsSync(file)) {
    throw new Error(`[extract-official-data] ${what} não encontrado: ${file}`);
  }
  return fs.readFileSync(file, 'utf-8');
}

export function readInstanceProvenance(instancePath: string): InstanceProvenance {
  const { root } = resolveInstanceDirs(instancePath);
  const manifestPath = path.join(root, 'flame', 'manifest.json');
  const cfgPath = path.join(root, 'instance.cfg');
  const manifest = JSON.parse(readRequiredFile(manifestPath, 'flame/manifest.json'));
  const cfg = readRequiredFile(cfgPath, 'instance.cfg');

  const cfgInt = (key: string): number => {
    const match = cfg.match(new RegExp(`^${key}=(\\d+)\\s*$`, 'm'));
    if (!match) throw new Error(`[extract-official-data] ${key} ausente em ${cfgPath}`);
    return Number(match[1]);
  };
  const loaders: Array<{ id: string; primary?: boolean }> = manifest.minecraft?.modLoaders ?? [];
  const loader = (loaders.find((l) => l.primary) ?? loaders[0])?.id;
  if (!manifest.name || !manifest.version || !manifest.minecraft?.version || !loader) {
    throw new Error(
      `[extract-official-data] ${manifestPath} sem name, version, minecraft.version ou modLoaders[].id`
    );
  }
  return {
    pack: {
      name: manifest.name,
      version: manifest.version,
      curseforgeProjectId: cfgInt('ManagedPackID'),
      curseforgeFileId: cfgInt('ManagedPackVersionID'),
    },
    minecraft: manifest.minecraft.version,
    loader,
  };
}

export const sha1OfFile = (file: string): string => createHash('sha1').update(fs.readFileSync(file)).digest('hex');
