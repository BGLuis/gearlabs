import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import { Material } from '../src/types/silentgear';
import { ModOrdering, parseModsToml } from '../src/lib/layer-order';
import { SCRIPT_LAYERS } from '../src/lib/script-layers';

export const BASE_MOD_ID = 'silentgear';

export interface InstanceJar {
  file: string;
  ordering: ModOrdering;
  /** o jar traz `data/<ns>/silentgear_materials/*.json`: só esses viram camada */
  hasMaterials: boolean;
}

/** Lê o mod id e a ordem de carga de todo jar de mods/, e vê se traz materiais do Silent Gear. */
export async function scanJars(modsDir: string): Promise<InstanceJar[]> {
  const jars: InstanceJar[] = [];
  for (const file of fs.readdirSync(modsDir).filter((f) => f.endsWith('.jar')).sort()) {
    const zip = await JSZip.loadAsync(fs.readFileSync(path.join(modsDir, file)));
    const toml = zip.file('META-INF/neoforge.mods.toml') ?? zip.file('META-INF/mods.toml');
    const mod = toml ? parseModsToml(await toml.async('text')) : undefined;
    if (!mod) continue;
    const hasMaterials = Object.values(zip.files).some(
      (entry) => !entry.dir && /^data\/[^/]+\/silentgear_materials\/.+\.json$/.test(entry.name)
    );
    jars.push({ file, ordering: { modId: mod.modId, after: mod.after, before: mod.before }, hasMaterials });
  }
  return jars;
}

export function findBaseJar(jars: InstanceJar[], modsDir: string): InstanceJar {
  const bases = jars.filter((jar) => jar.ordering.modId === BASE_MOD_ID);
  if (bases.length !== 1) {
    throw new Error(
      `[extract-official-data] esperado exatamente 1 jar com mod id ${BASE_MOD_ID} em ${modsDir}, achei ${bases.length}` +
        (bases.length ? `: ${bases.map((b) => b.file).join(', ')}` : '')
    );
  }
  return bases[0];
}

export interface ScriptRoot {
  id: string;
  name: string;
  /** arquivos lidos: um por caminho relativo, a subpasta de maior precedência vence */
  materialFiles: string[];
  traitFiles: string[];
}

function listJson(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? listJson(path.join(dir, entry.name))
        : entry.isFile() && entry.name.endsWith('.json')
        ? [path.join(dir, entry.name)]
        : []
    );
}

/** Raízes de script com ao menos um material ou trait; pasta que existe mas está vazia não conta. */
export function findScriptRoots(gameDir: string): ScriptRoot[] {
  const roots: ScriptRoot[] = [];
  for (const layer of SCRIPT_LAYERS) {
    const byRelative = new Map<string, string>();
    for (const dataDir of layer.dataDirs) {
      const dir = path.join(gameDir, layer.id, dataDir);
      for (const file of listJson(dir)) byRelative.set(path.relative(dir, file), file);
    }
    const files = [...byRelative.values()].map((f) => f.split(path.sep).join('/'));
    const materialFiles = files.filter((f) => /\/silentgear_materials\//.test(f));
    const traitFiles = files.filter((f) => /\/silentgear_traits\//.test(f));
    if (materialFiles.length + traitFiles.length > 0) {
      roots.push({ id: layer.id, name: layer.name, materialFiles, traitFiles });
    }
  }
  return roots;
}

/** Id que já existe numa camada anterior reescreve o material (override); id novo é material novo. */
export function splitMaterials(
  incoming: Record<string, Material>,
  known: ReadonlySet<string>
): { materials: Record<string, Material>; overrides: Record<string, Partial<Material>> } {
  const materials: Record<string, Material> = {};
  const overrides: Record<string, Partial<Material>> = {};
  for (const [id, mat] of Object.entries(incoming)) {
    if (known.has(id)) {
      overrides[id] = {
        categories: mat.categories,
        stats: mat.stats,
        traits: mat.traits,
        statModifiers: mat.statModifiers,
        harvest_tier: mat.harvest_tier,
        tier: mat.tier,
        color: mat.color,
      };
    } else {
      materials[id] = mat;
    }
  }
  return { materials, overrides };
}
