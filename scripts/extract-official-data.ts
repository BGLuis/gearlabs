import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import JSZip from 'jszip';
import {
  AddonConfig,
  CatalogLayer,
  CatalogSource,
  CatalogSourceFile,
  GearType,
  Material,
  MaterialCategory,
  PartSlot,
  StatModifierEntry,
  StatOperation,
  TraitInfo,
  VersionCatalog,
  CatalogIndex,
} from '../src/types/silentgear';
import { VERSIONED_PRESET, appendIndexEntry, isValidVersionId } from '../src/lib/catalog-index';
import {
  OFFICIAL_GEAR_TYPES,
  OFFICIAL_TRAITS,
} from '../src/data/defaultCatalog';

export const SILENT_GEAR_COMMIT = 'cb9926f4a3215a2f6016e4b465d1029ce06251e4';

import {
  parseMaterialJson,
  resolveMaterialParents,
  formatMaterialName,
  normalizeColor,
  parseStatValueEntry as parseStatEntry,
  parseHarvestTier,
} from '../src/lib/datapack-parser';
import { getGearTypeAncestors } from '../src/lib/gear-type-hierarchy';
import { parseTraitJson, TraitLang } from '../src/lib/trait-parser';
import { resolveCatalogWithAddons } from '../src/lib/layer-resolver';

export const ATM_ADDONS: AddonConfig[] = [
  {
    id: 'silentgems',
    name: "Silent's Gems",
    version: '5.1.4',
    enabled: true,
    description: 'Adiciona 21 gemas modulares, ouro reforçado e prata reforçada.',
  },
  {
    id: 'sgearmetalworks',
    name: 'Silent Gear Metalworks',
    version: '1.6.0',
    enabled: true,
    description: 'Adiciona fundição (categoria casting), Uru Metal e Carne.',
  },
  {
    id: 'kubejs',
    name: 'KubeJS (ATM)',
    version: '220614e',
    enabled: true,
    description: 'Dados dinâmicos do All The Mods com Allthemodium, Vibranium e Unobtainium.',
  },
];

// Issue #38: extração oficial de harvest_tier respeitando level_hint
export { formatMaterialName, normalizeColor, parseStatEntry, parseHarvestTier };

export function parseMaterialFile(filePath: string): Material {
  const content = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(content);
  const mat = parseMaterialJson(filePath, json);
  if (!mat) {
    throw new Error(`[extract-official-data] Erro ao analisar material em ${filePath}`);
  }
  return mat;
}

function findJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results;
}

export interface ExtractedCatalogData {
  baseMaterials: Record<string, Material>;
  layers: Record<string, CatalogLayer>;
  resolvedMaterials: Record<string, Material>;
}

export function extractOfficialCatalogData(projectRoot: string): ExtractedCatalogData {
  // 1. Camada 1: Silent Gear Base (4.2.3)
  const baseRaw: Record<string, Material> = {};
  const sgDir = path.join(projectRoot, 'data/silentgear/silentgear_materials');
  const sgFiles = findJsonFiles(sgDir);
  for (const file of sgFiles) {
    try {
      const mat = parseMaterialFile(file);
      mat.source = 'silentgear';
      baseRaw[mat.id] = mat;
    } catch (e) {
      console.warn(`[extract-official-data] Erro ao ler ${file}:`, e);
    }
  }
  const baseMaterials = resolveMaterialParents(baseRaw);

  const layers: Record<string, CatalogLayer> = {};

  // 2. Camada 2: Silent's Gems (5.1.4)
  const gemsDir = path.join(projectRoot, 'data/silentgems/silentgear_materials');
  const gemsMaterials: Record<string, Material> = {};
  if (fs.existsSync(gemsDir)) {
    for (const file of findJsonFiles(gemsDir)) {
      try {
        const mat = parseMaterialFile(file);
        mat.source = 'silentgems';
        gemsMaterials[mat.id] = mat;
      } catch (e) {
        console.warn(`[extract-official-data] Erro ao ler ${file}:`, e);
      }
    }
  }
  layers['silentgems'] = {
    id: 'silentgems',
    name: "Silent's Gems",
    version: '5.1.4',
    materials: gemsMaterials,
  };

  // 3. Camada 3: Silent Gear Metalworks (1.6.0)
  const smwNewMaterials: Record<string, Material> = {};
  const smwOverrides: Record<string, Partial<Material>> = {};

  // a) Materiais novos de sgearmetalworks (ex: uru_metal, meat)
  const smwNewDir = path.join(projectRoot, 'data/sgearmetalworks/sgearmetalworks/silentgear_materials');
  if (fs.existsSync(smwNewDir)) {
    for (const file of findJsonFiles(smwNewDir)) {
      try {
        const mat = parseMaterialFile(file);
        mat.source = 'sgearmetalworks';
        smwNewMaterials[mat.id] = mat;
      } catch (e) {
        console.warn(`[extract-official-data] Erro ao ler ${file}:`, e);
      }
    }
  }

  // b) Overrides de silentgear (adiciona casting a 38 metais, flint, etc.)
  const smwSgDir = path.join(projectRoot, 'data/sgearmetalworks/silentgear/silentgear_materials');
  if (fs.existsSync(smwSgDir)) {
    for (const file of findJsonFiles(smwSgDir)) {
      try {
        const mat = parseMaterialFile(file);
        smwOverrides[mat.id] = {
          categories: mat.categories,
          stats: mat.stats,
          traits: mat.traits,
          statModifiers: mat.statModifiers,
        };
      } catch (e) {
        console.warn(`[extract-official-data] Erro ao ler ${file}:`, e);
      }
    }
  }

  // c) Overrides de silentgems (adiciona casting às 21 gemas)
  const smwGemsDir = path.join(projectRoot, 'data/sgearmetalworks/silentgems/silentgear_materials');
  if (fs.existsSync(smwGemsDir)) {
    for (const file of findJsonFiles(smwGemsDir)) {
      try {
        const mat = parseMaterialFile(file);
        smwOverrides[mat.id] = {
          categories: mat.categories,
        };
      } catch (e) {
        console.warn(`[extract-official-data] Erro ao ler ${file}:`, e);
      }
    }
  }

  layers['sgearmetalworks'] = {
    id: 'sgearmetalworks',
    name: 'Silent Gear Metalworks',
    version: '1.6.0',
    materials: smwNewMaterials,
    overrides: smwOverrides,
  };

  // 4. Camada 4: KubeJS do ATM-11
  const kubejsDir = path.join(projectRoot, 'kubejs/dynamic_data');
  const kubejsMaterials: Record<string, Material> = {};
  const kubejsOverrides: Record<string, Partial<Material>> = {};
  if (fs.existsSync(kubejsDir)) {
    const kubejsFiles = findJsonFiles(kubejsDir).filter((f) => f.includes('/silentgear_materials/'));
    for (const file of kubejsFiles) {
      try {
        const mat = parseMaterialFile(file);
        if (mat.id.startsWith('sgearmetalworks:')) {
          kubejsOverrides[mat.id] = {
            stats: mat.stats,
            traits: mat.traits,
            statModifiers: mat.statModifiers,
            harvest_tier: mat.harvest_tier,
          };
        } else {
          mat.source = 'kubejs';
          kubejsMaterials[mat.id] = mat;
        }
      } catch (e) {
        console.warn(`[extract-official-data] Erro ao ler ${file}:`, e);
      }
    }
  }
  layers['kubejs'] = {
    id: 'kubejs',
    name: 'KubeJS (ATM)',
    version: '220614e',
    materials: kubejsMaterials,
    overrides: kubejsOverrides,
  };

  // 5. Resolver catálogo completo padrão (com todos os addons ativos)
  const resolvedMaterials = resolveCatalogWithAddons(
    baseMaterials,
    layers,
    ['silentgems', 'sgearmetalworks', 'kubejs']
  );

  return {
    baseMaterials,
    layers,
    resolvedMaterials,
  };
}

export function extractAllMaterials(projectRoot: string): Record<string, Material> {
  const { resolvedMaterials } = extractOfficialCatalogData(projectRoot);
  return resolvedMaterials;
}

export interface JarExtractionResult {
  id: string;
  name: string;
  version: string;
  jar: string;
  materials: Record<string, Material>;
  parts: Record<string, RawPartData>;
  overrides: Record<string, Partial<Material>>;
  rawTraits: Record<string, any>;
  lang: TraitLang;
}

export async function extractDataFromJar(jarPath: string): Promise<JarExtractionResult> {
  const buffer = fs.readFileSync(jarPath);
  const zip = await JSZip.loadAsync(buffer);
  const jarName = path.basename(jarPath);

  let id = 'unknown';
  let name = jarName;
  let version = 'unknown';

  if (jarName.includes('sgearmetalworks')) {
    id = 'sgearmetalworks';
    name = 'Silent Gear Metalworks';
  } else if (jarName.includes('silentgems') || jarName.includes('silent-gems')) {
    id = 'silentgems';
    name = "Silent's Gems";
  } else if (jarName.includes('silent-gear') || jarName.includes('silentgear')) {
    id = 'silentgear';
    name = 'Silent Gear';
  }

  const tomlFile = zip.file('META-INF/neoforge.mods.toml') || zip.file('META-INF/mods.toml');
  if (tomlFile) {
    const tomlContent = await tomlFile.async('text');
    const verMatch = tomlContent.match(/version\s*=\s*(["'])(.*?)\1/);
    if (verMatch) {
      // sgearmetalworks publica "26.1.2-1.6.0": o prefixo é a versão do Minecraft
      version = verMatch[2].replace(/^\d+\.\d+(?:\.\d+)?-/, '');
    }
    const nameMatch = tomlContent.match(/displayName\s*=\s*(["'])(.*?)\1/);
    if (nameMatch) {
      name = nameMatch[2];
    }
  }

  if (version === 'unknown') {
    const m = jarName.match(/(\d+\.\d+\.\d+(?:[a-zA-Z0-9_.-]*))(?:\.jar)?$/);
    if (m) version = m[1];
  }

  const materials: Record<string, Material> = {};
  const overrides: Record<string, Partial<Material>> = {};
  const parts: Record<string, RawPartData> = {};
  const rawTraits: Record<string, any> = {};
  const lang: TraitLang = { en: {}, pt: {} };

  for (const [relPath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir || !relPath.endsWith('.json')) continue;

    const langMatch = relPath.match(/^assets\/[^/]+\/lang\/(en_us|pt_br)\.json$/);
    const traitMatch = relPath.match(/^data\/([^/]+)\/silentgear_traits\/(.+)\.json$/);
    if (langMatch) {
      Object.assign(langMatch[1] === 'en_us' ? lang.en : lang.pt, JSON.parse(await zipEntry.async('text')));
    } else if (traitMatch) {
      rawTraits[`${traitMatch[1]}:${traitMatch[2]}`] = JSON.parse(await zipEntry.async('text'));
    } else if (relPath.includes('/silentgear_materials/')) {
      try {
        const text = await zipEntry.async('text');
        const json = JSON.parse(text);
        const mat = parseMaterialJson(relPath, json);
        if (mat) {
          mat.source = id;
          if (id === 'sgearmetalworks' && !relPath.includes('/sgearmetalworks/silentgear_materials/')) {
            overrides[mat.id] = {
              categories: mat.categories,
              stats: mat.stats,
              traits: mat.traits,
              statModifiers: mat.statModifiers,
            };
          } else {
            materials[mat.id] = mat;
          }
        }
      } catch (e) {
        console.warn(`[extract-official-data] Erro ao analisar material no jar ${jarName}:${relPath}:`, e);
      }
    } else if (relPath.includes('/silentgear_parts/')) {
      try {
        const text = await zipEntry.async('text');
        const json = JSON.parse(text);
        const baseName = path.basename(relPath, '.json');
        parts[baseName] = json;
      } catch (e) {
        console.warn(`[extract-official-data] Erro ao analisar part no jar ${jarName}:${relPath}:`, e);
      }
    }
  }

  return {
    id,
    name,
    version,
    jar: jarName,
    materials,
    parts,
    overrides,
    rawTraits,
    lang,
  };
}

export interface InstanceProvenance {
  pack: CatalogSource['pack'];
  minecraft: string;
  loader: string;
}

export interface ExtractFromInstanceOptions {
  now?: () => Date;
  warn?: (message: string) => void;
}

// O caminho pode ser a raiz da instância do Prism (com `flame/`, `instance.cfg` e
// `minecraft/`) ou a própria pasta `minecraft/` (formato aceito antes do #94).
function resolveInstanceDirs(instancePath: string): { root: string; gameDir: string } {
  const nested = path.join(instancePath, 'minecraft');
  return fs.existsSync(nested)
    ? { root: instancePath, gameDir: nested }
    : { root: path.dirname(instancePath), gameDir: instancePath };
}

function readRequiredFile(file: string, what: string): string {
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

function formatIsoWithOffset(date: Date): string {
  const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`
  );
}

// hashes SHA-1 que o Prism guarda em mods/.index/*.pw.toml, por nome de arquivo
function readPrismIndexHashes(modsDir: string): Record<string, string> {
  const indexDir = path.join(modsDir, '.index');
  const hashes: Record<string, string> = {};
  if (!fs.existsSync(indexDir)) return hashes;
  for (const entry of fs.readdirSync(indexDir).filter((f) => f.endsWith('.pw.toml'))) {
    const toml = fs.readFileSync(path.join(indexDir, entry), 'utf-8');
    const filename = toml.match(/^filename\s*=\s*'([^']+)'/m)?.[1];
    const hash = toml.match(/^hash\s*=\s*'([0-9a-f]+)'/m)?.[1];
    const format = toml.match(/^hash-format\s*=\s*'([^']+)'/m)?.[1];
    if (filename && hash && format === 'sha1') hashes[filename] = hash;
  }
  return hashes;
}

export async function extractFromInstance(
  instancePath: string,
  options: ExtractFromInstanceOptions = {}
): Promise<
  ExtractedCatalogData & {
    addons: AddonConfig[];
    jarParts?: Record<string, RawPartData>;
    traits: Record<string, TraitInfo>;
    source: CatalogSource;
  }
> {
  const provenance = readInstanceProvenance(instancePath);
  const { root, gameDir } = resolveInstanceDirs(instancePath);
  const warn = options.warn ?? ((message: string) => console.warn(message));
  const modsDir = path.join(gameDir, 'mods');
  const kubejsDir = path.join(gameDir, 'kubejs/dynamic_data');
  const kubejsAltDir = path.join(gameDir, 'kubejs/data');

  if (!fs.existsSync(modsDir)) {
    throw new Error(`[extract-official-data] Pasta mods não encontrada na instância: ${modsDir}`);
  }

  const modFiles = fs.readdirSync(modsDir).filter((f) => f.endsWith('.jar'));
  const sgJar = modFiles.find((f) => f.includes('silent-gear') || f.includes('silentgear'));
  const smwJar = modFiles.find((f) => f.includes('sgearmetalworks'));
  const gemsJar = modFiles.find((f) => f.includes('silentgems') || f.includes('silent-gems'));

  const files: CatalogSourceFile[] = [];
  const prismHashes = readPrismIndexHashes(modsDir);
  const recordFile = (file: string, entry: Omit<CatalogSourceFile, 'path' | 'sha1'>) => {
    const sha1 = createHash('sha1').update(fs.readFileSync(file)).digest('hex');
    const expected = prismHashes[path.basename(file)];
    if (entry.kind === 'jar' && expected && expected !== sha1) {
      warn(
        `[extract-official-data] ${path.basename(file)} difere do .index do Prism: arquivo ${sha1}, .index ${expected}. Gravando o hash do arquivo lido.`
      );
    }
    files.push({ path: path.relative(root, file).split(path.sep).join('/'), ...entry, sha1 });
  };
  // só entram em source.files os jars que de fato geraram materiais, traits ou lang
  const readJar = async (jarFile: string): Promise<JarExtractionResult> => {
    const jarPath = path.join(modsDir, jarFile);
    const data = await extractDataFromJar(jarPath);
    const produced =
      Object.keys(data.materials).length +
        Object.keys(data.overrides).length +
        Object.keys(data.rawTraits).length +
        Object.keys(data.lang.en).length +
        Object.keys(data.lang.pt).length >
      0;
    if (produced) recordFile(jarPath, { kind: 'jar', modId: data.id, version: data.version });
    return data;
  };

  let baseMaterials: Record<string, Material> = {};
  let jarParts: Record<string, RawPartData> = {};
  const layers: Record<string, CatalogLayer> = {};
  const addons: AddonConfig[] = [];
  const rawTraits: Record<string, any> = {};
  const lang: TraitLang = { en: {}, pt: {} };
  const mergeTraitData = (data: JarExtractionResult) => {
    Object.assign(rawTraits, data.rawTraits);
    Object.assign(lang.en, data.lang.en);
    Object.assign(lang.pt, data.lang.pt);
  };

  if (sgJar) {
    const sgData = await readJar(sgJar);
    mergeTraitData(sgData);
    baseMaterials = resolveMaterialParents(sgData.materials);
    jarParts = sgData.parts;
    addons.push({
      id: 'silentgear',
      name: sgData.name,
      version: sgData.version,
      enabled: true,
      description: `Silent Gear oficial extraído do jar ${sgJar}.`,
      jar: sgJar,
    });
  }

  if (gemsJar) {
    const gemsData = await readJar(gemsJar);
    mergeTraitData(gemsData);
    layers['silentgems'] = {
      id: 'silentgems',
      name: gemsData.name,
      version: gemsData.version,
      materials: gemsData.materials,
    };
    addons.push({
      id: 'silentgems',
      name: gemsData.name,
      version: gemsData.version,
      enabled: true,
      description: `Silent's Gems extraído do jar ${gemsJar}.`,
      jar: gemsJar,
    });
  }

  if (smwJar) {
    const smwData = await readJar(smwJar);
    mergeTraitData(smwData);
    layers['sgearmetalworks'] = {
      id: 'sgearmetalworks',
      name: smwData.name,
      version: smwData.version,
      materials: smwData.materials,
      overrides: smwData.overrides,
    };
    addons.push({
      id: 'sgearmetalworks',
      name: smwData.name,
      version: smwData.version,
      enabled: true,
      description: `Silent Gear Metalworks extraído do jar ${smwJar}.`,
      jar: smwJar,
    });
  }

  const activeKubeDir = fs.existsSync(kubejsDir)
    ? kubejsDir
    : fs.existsSync(kubejsAltDir)
    ? kubejsAltDir
    : undefined;

  if (activeKubeDir) {
    const kubejsMaterials: Record<string, Material> = {};
    const kubejsOverrides: Record<string, Partial<Material>> = {};
    for (const file of findJsonFiles(activeKubeDir).filter((f) => f.includes('/silentgear_traits/'))) {
      const [, ns, name] = file.replace(/\\/g, '/').match(/([^/]+)\/silentgear_traits\/(.+)\.json$/) ?? [];
      if (ns && name) {
        rawTraits[`${ns}:${name}`] = JSON.parse(fs.readFileSync(file, 'utf-8'));
        recordFile(file, { kind: 'script-data' });
      }
    }
    const kubejsFiles = findJsonFiles(activeKubeDir).filter((f) => f.includes('/silentgear_materials/'));
    for (const file of kubejsFiles) {
      try {
        const mat = parseMaterialFile(file);
        recordFile(file, { kind: 'script-data' });
        if (mat.id.startsWith('sgearmetalworks:')) {
          kubejsOverrides[mat.id] = {
            stats: mat.stats,
            traits: mat.traits,
            statModifiers: mat.statModifiers,
            harvest_tier: mat.harvest_tier,
          };
        } else {
          mat.source = 'kubejs';
          kubejsMaterials[mat.id] = mat;
        }
      } catch (e) {
        console.warn(`[extract-official-data] Erro ao ler kubejs ${file}:`, e);
      }
    }
    layers['kubejs'] = {
      id: 'kubejs',
      name: 'KubeJS (ATM)',
      version: 'dynamic',
      materials: kubejsMaterials,
      overrides: kubejsOverrides,
    };
    addons.push({
      id: 'kubejs',
      name: 'KubeJS (ATM)',
      version: 'dynamic',
      enabled: true,
      description: 'Dados dinâmicos do All The Mods com Allthemodium, Vibranium e Unobtainium.',
      jar: 'kubejs',
    });
  }

  const enabledAddonIds = addons.map((a) => a.id).filter((id) => id !== 'silentgear');
  const resolvedMaterials = resolveCatalogWithAddons(baseMaterials, layers, enabledAddonIds);

  return {
    baseMaterials,
    layers,
    resolvedMaterials,
    addons,
    jarParts,
    traits: Object.fromEntries(
      Object.entries(rawTraits).map(([id, json]) => [id, parseTraitJson(id, json, lang, OFFICIAL_TRAITS[id])])
    ),
    source: {
      ...provenance,
      files: files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
      extractedAt: formatIsoWithOffset((options.now ?? (() => new Date()))()),
    },
  };
}

export interface RawPartData {
  type?: string;
  gear_type?: string;
  part_type?: string;
  crafting?: {
    gear_type_blacklist?: string[];
  };
}

export function extractOfficialParts(projectRoot: string): Record<string, RawPartData> {
  const partsDir = path.join(projectRoot, 'data/silentgear/silentgear_parts');
  const files = findJsonFiles(partsDir);
  const parts: Record<string, RawPartData> = {};

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const json = JSON.parse(content);
      const baseName = path.basename(file, '.json');
      parts[baseName] = json;
    } catch (e) {
      console.warn(`[extract-official-data] Erro ao ler part ${file}:`, e);
    }
  }

  return parts;
}

export const CANONICAL_OPTIONAL_SLOTS: PartSlot[] = ['tip', 'grip', 'lining', 'coating', 'binding'];

export function deriveOptionalSlots(
  gearTypeId: string,
  parts: Record<string, RawPartData>
): PartSlot[] {
  const ancestors = getGearTypeAncestors(gearTypeId);
  const optionalSlots: PartSlot[] = [];

  const slotPartMap: Record<PartSlot, string> = {
    tip: 'tip',
    grip: 'grip',
    lining: 'lining',
    coating: 'coating',
    binding: 'binding',
    main: '',
    rod: '',
  };

  for (const slot of CANONICAL_OPTIONAL_SLOTS) {
    const partFile = slotPartMap[slot];
    const part = parts[partFile];
    if (!part) continue;

    const partGearType = (part.gear_type || 'silentgear:all').replace(/^silentgear:/, '');
    const blacklist = (part.crafting?.gear_type_blacklist || []).map((b) =>
      b.replace(/^silentgear:/, '')
    );

    const matches = ancestors.includes(partGearType);
    const isBlacklisted = ancestors.some((a) => blacklist.includes(a));

    if (matches && !isBlacklisted) {
      optionalSlots.push(slot);
    }
  }

  return optionalSlots;
}

export function deriveGearTypes(
  baseGearTypes: Record<string, GearType>,
  projectRoot: string,
  providedParts?: Record<string, RawPartData>
): Record<string, GearType> {
  const parts =
    providedParts && Object.keys(providedParts).length > 0
      ? providedParts
      : extractOfficialParts(projectRoot);
  const derived: Record<string, GearType> = {};

  for (const [id, gearType] of Object.entries(baseGearTypes)) {
    const optionalSlots = deriveOptionalSlots(id, parts);
    derived[id] = {
      ...gearType,
      optionalSlots,
    };
  }

  return derived;
}

export function exportCatalog(
  version: string,
  materials: Record<string, Material>,
  targetDir: string,
  sourceCommit?: string,
  gearTypes: Record<string, GearType> = OFFICIAL_GEAR_TYPES,
  baseMaterials?: Record<string, Material>,
  layers?: Record<string, CatalogLayer>,
  addons?: AddonConfig[],
  traits: Record<string, TraitInfo> = OFFICIAL_TRAITS,
  source?: CatalogSource,
  /** pasta sob `targetDir/version`; vazia grava direto em `targetDir/version` */
  versionFolder?: string
): string {
  const catalog: VersionCatalog = {
    version,
    ...(sourceCommit && { sourceCommit }),
    ...(source && { source }),
    materials,
    ...(baseMaterials && { baseMaterials }),
    ...(layers && { layers }),
    ...(addons && { addons }),
    gearTypes,
    traits,
  };

  const dir = path.join(targetDir, version, ...(versionFolder ? [versionFolder] : []));
  const file = path.join(dir, 'catalog.json');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(
    `[extract-official-data] Catalog saved for ${version} in ${file} (${Object.keys(materials).length} materials)`
  );
  return file;
}

export interface Atm11Publication {
  id: string;
  dir: string;
  index: CatalogIndex | null;
}

/**
 * Valida, antes de qualquer escrita, que a versão do pack pode ser publicada: o id vem de
 * `source.pack.version` e a pasta `atm11/<id>` não pode existir (versões publicadas são imutáveis).
 */
export function planAtm11Publication(outDir: string, source: CatalogSource | undefined): Atm11Publication {
  const id = source?.pack.version;
  if (!id) {
    throw new Error('atm11 só é publicado com --instance: a versão do pack vem de source.pack.version');
  }
  if (!isValidVersionId(id)) {
    throw new Error(`versão do pack inválida para nome de pasta: '${id}'`);
  }
  const dir = path.join(outDir, VERSIONED_PRESET, id);
  if (fs.existsSync(dir)) {
    throw new Error(`a versão ${id} já está publicada em ${dir}; versões publicadas nunca são reescritas`);
  }
  const indexFile = path.join(outDir, VERSIONED_PRESET, 'index.json');
  const index = fs.existsSync(indexFile)
    ? (JSON.parse(fs.readFileSync(indexFile, 'utf-8')) as CatalogIndex)
    : null;
  if (index?.versions.some((v) => v.id === id)) {
    throw new Error(`a versão ${id} já consta em ${indexFile}`);
  }
  return { id, dir, index };
}

export function registerAtm11Version(
  outDir: string,
  plan: Atm11Publication,
  catalogFile: string,
  source: CatalogSource
): CatalogIndex {
  const sha1 = createHash('sha1').update(fs.readFileSync(catalogFile)).digest('hex');
  const next = appendIndexEntry(plan.index, { id: plan.id, folder: plan.id, minecraft: source.minecraft, sha1 });
  fs.writeFileSync(path.join(outDir, VERSIONED_PRESET, 'index.json'), JSON.stringify(next, null, 2) + '\n', 'utf-8');
  return next;
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const outArgIdx = process.argv.indexOf('--out');
  const outDir =
    outArgIdx !== -1 && process.argv[outArgIdx + 1]
      ? path.resolve(process.argv[outArgIdx + 1])
      : path.resolve(projectRoot, 'public/data/versions');

  const instanceArgIdx = process.argv.indexOf('--instance');
  const instancePath =
    instanceArgIdx !== -1 && process.argv[instanceArgIdx + 1]
      ? path.resolve(process.argv[instanceArgIdx + 1])
      : undefined;

  let baseMaterials: Record<string, Material>;
  let layers: Record<string, CatalogLayer>;
  let resolvedMaterials: Record<string, Material>;
  let addons = ATM_ADDONS;
  let customParts: Record<string, RawPartData> | undefined;
  let traits: Record<string, TraitInfo> | undefined;
  let source: CatalogSource | undefined;

  if (instancePath) {
    console.log(`[extract-official-data] Extraindo dados da instância oficial: ${instancePath}`);
    const instanceData = await extractFromInstance(instancePath);
    baseMaterials = instanceData.baseMaterials;
    layers = instanceData.layers;
    resolvedMaterials = instanceData.resolvedMaterials;
    // o Silent Gear base não é um addon alternável: as camadas dependem dele
    addons = instanceData.addons.filter((addon) => addon.id !== 'silentgear');
    customParts = instanceData.jarParts;
    traits = instanceData.traits;
    source = instanceData.source;
  } else {
    console.log(`[extract-official-data] Extraindo dados oficiais para: ${outDir}`);
    const extracted = extractOfficialCatalogData(projectRoot);
    baseMaterials = extracted.baseMaterials;
    layers = extracted.layers;
    resolvedMaterials = extracted.resolvedMaterials;
  }

  console.log(
    `[extract-official-data] Extraídos ${Object.keys(baseMaterials).length} materiais base e ${Object.keys(resolvedMaterials).length} materiais resolvidos.`
  );

  // 2. Derivar slots oficiais a partir das partes e hierarquia
  const derivedGearTypes = deriveGearTypes(OFFICIAL_GEAR_TYPES, projectRoot, customParts);

  // 3. Exportar modpack ATM11 em atm11/<versão do pack>/ e registrá-lo no índice
  const publication = planAtm11Publication(outDir, source);
  const atm11File = exportCatalog('atm11', resolvedMaterials, outDir, undefined, derivedGearTypes, baseMaterials, layers, addons, traits, source, publication.id);
  const index = registerAtm11Version(outDir, publication, atm11File, source!);
  console.log(`[extract-official-data] atm11 index: latest ${index.latest}, ${index.versions.length} version(s)`);

  // 4. Exportar versão oficial 1.21.1 (apenas base Silent Gear, sem addons)
  exportCatalog('1.21.1', baseMaterials, outDir, SILENT_GEAR_COMMIT, derivedGearTypes, baseMaterials, {}, [], traits);

  console.log('[extract-official-data] Todos os catálogos oficiais gerados com sucesso!');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
