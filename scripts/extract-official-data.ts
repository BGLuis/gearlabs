import * as fs from 'fs';
import * as path from 'path';
import {
  GearType,
  Material,
  MaterialCategory,
  PartSlot,
  StatModifierEntry,
  StatOperation,
  VersionCatalog,
} from '../src/types/silentgear';
import {
  OFFICIAL_GEAR_TYPES,
  OFFICIAL_TRAITS,
} from '../src/data/defaultCatalog';

export const ATM11_COMMIT = '220614ecfacee7a4099696970471fe70ab7c72ed';
export const SILENT_GEAR_COMMIT = 'cb9926f4a3215a2f6016e4b465d1029ce06251e4';

import {
  parseMaterialJson,
  resolveMaterialParents,
  formatMaterialName,
  normalizeColor,
  parseStatValueEntry as parseStatEntry,
} from '../src/lib/datapack-parser';

export { formatMaterialName, normalizeColor, parseStatEntry };

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

export function extractAllMaterials(projectRoot: string): Record<string, Material> {
  const materials: Record<string, Material> = {};

  // Camada 1: Datagen Silent Gear 4.2.3
  const sgDir = path.join(projectRoot, 'data/silentgear/silentgear_materials');
  const sgFiles = findJsonFiles(sgDir);
  for (const file of sgFiles) {
    try {
      const mat = parseMaterialFile(file);
      materials[mat.id] = mat;
    } catch (e) {
      console.warn(`[extract-official-data] Erro ao ler ${file}:`, e);
    }
  }

  // Camada 2: Silent Gear Metalworks
  const smwDir = path.join(projectRoot, 'data/sgearmetalworks');
  const smwFiles = findJsonFiles(smwDir).filter((f) => f.includes('/silentgear_materials/'));
  for (const file of smwFiles) {
    try {
      const mat = parseMaterialFile(file);
      // Mescla ou sobrescreve sobre base
      materials[mat.id] = mat;
    } catch (e) {
      console.warn(`[extract-official-data] Erro ao ler ${file}:`, e);
    }
  }

  // Camada 3: KubeJS do ATM-11
  const kubejsDir = path.join(projectRoot, 'kubejs/dynamic_data');
  const kubejsFiles = findJsonFiles(kubejsDir).filter((f) => f.includes('/silentgear_materials/'));
  for (const file of kubejsFiles) {
    try {
      const mat = parseMaterialFile(file);
      materials[mat.id] = mat;
    } catch (e) {
      console.warn(`[extract-official-data] Erro ao ler ${file}:`, e);
    }
  }

  return resolveMaterialParents(materials);
}

export function generateTsvDump(materials: Record<string, Material>, outTsvPath: string) {
  const lines: string[] = [];
  lines.push('Pack\tName\tType\tID\tParent\tCategories\tDurability\tArmor Durability\tArmor\tArmor Toughness\tMagic Armor');

  for (const [id, mat] of Object.entries(materials)) {
    if (!mat.stats?.main) continue;
    const pack = id.startsWith('sgearmetalworks:')
      ? 'kubejs'
      : id.startsWith('silentgear:allthemodium') || id.startsWith('silentgear:vibranium') || id.startsWith('silentgear:unobtainium')
      ? 'kubejs'
      : (mat.categories?.includes('casting') ? 'mod/sgearmetalworks' : 'silentgear');

    const name = mat.name.en;
    const type = 'Main';
    const parent = mat.parent || '';
    const categoriesStr = (mat.categories || [mat.category])
      .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
      .join(', ');

    const dur = typeof mat.stats.main.durability === 'number' ? mat.stats.main.durability : 0;
    const armorDur = typeof mat.stats.main.armor_durability === 'number' ? mat.stats.main.armor_durability : 0;
    const armor = typeof mat.stats.main.armor === 'number' ? mat.stats.main.armor : 0;
    const toughness = typeof mat.stats.main.armor_toughness === 'number' ? mat.stats.main.armor_toughness : 0;
    const magicArmor = typeof mat.stats.main.magic_armor === 'number' ? mat.stats.main.magic_armor : 0;

    lines.push(`${pack}\t${name}\t${type}\t${id}\t${parent}\t${categoriesStr}\t${dur}\t${armorDur}\t${armor}\t${toughness}\t${magicArmor}`);
  }

  fs.mkdirSync(path.dirname(outTsvPath), { recursive: true });
  fs.writeFileSync(outTsvPath, lines.join('\n') + '\n', 'utf-8');
  console.log(`[extract-official-data] TSV dump exportado para ${outTsvPath} (${lines.length - 1} materiais Main)`);
}

export interface RawPartData {
  type?: string;
  gear_type?: string;
  part_type?: string;
  crafting?: {
    gear_type_blacklist?: string[];
  };
}

// Hierarquia oficial de tipos do Silent Gear (GearTypes.java)
export const GEAR_TYPE_PARENTS: Record<string, string | null> = {
  all: null,
  tool: 'all',
  armor: 'all',
  curio: 'all',
  projectile: 'all',
  weapon: 'tool',
  harvest_tool: 'tool',
  melee_weapon: 'weapon',
  ranged_weapon: 'weapon',
  hybrid_weapon: 'weapon',
  sword: 'melee_weapon',
  katana: 'melee_weapon',
  machete: 'melee_weapon',
  spear: 'melee_weapon',
  mace: 'melee_weapon',
  dagger: 'melee_weapon',
  knife: 'melee_weapon',
  bow: 'ranged_weapon',
  crossbow: 'ranged_weapon',
  slingshot: 'ranged_weapon',
  trident: 'hybrid_weapon',
  pickaxe: 'harvest_tool',
  axe: 'harvest_tool',
  shovel: 'harvest_tool',
  hoe: 'harvest_tool',
  shears: 'harvest_tool',
  sickle: 'harvest_tool',
  mattock: 'harvest_tool',
  paxel: 'harvest_tool',
  helmet: 'armor',
  chestplate: 'armor',
  leggings: 'armor',
  boots: 'armor',
  elytra: 'armor',
};

export function getGearTypeAncestors(gearTypeId: string): string[] {
  const normalized = gearTypeId.replace(/^silentgear:/, '');
  const ancestors: string[] = [normalized];
  let current: string | null | undefined = normalized;

  while (current && GEAR_TYPE_PARENTS[current] !== undefined && GEAR_TYPE_PARENTS[current] !== null) {
    const parent: string | null = GEAR_TYPE_PARENTS[current];
    if (!parent) break;
    ancestors.push(parent);
    current = parent;
  }

  return ancestors;
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
  projectRoot: string
): Record<string, GearType> {
  const parts = extractOfficialParts(projectRoot);
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
  gearTypes: Record<string, GearType> = OFFICIAL_GEAR_TYPES
) {
  const catalog: VersionCatalog = {
    version,
    ...(sourceCommit && { sourceCommit }),
    materials,
    gearTypes,
    traits: OFFICIAL_TRAITS,
  };

  const dir = path.join(targetDir, version);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(
    `[extract-official-data] Catalog saved for ${version} in ${dir}/catalog.json (${Object.keys(materials).length} materials)`
  );
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const outDir = path.resolve(projectRoot, 'public/data/versions');
  console.log(`[extract-official-data] Extraindo dados oficiais para: ${outDir}`);

  // 1. Extração completa a partir das 3 camadas
  const materials = extractAllMaterials(projectRoot);
  console.log(`[extract-official-data] Extraídos ${Object.keys(materials).length} materiais das fontes oficiais.`);

  // 2. Derivar slots oficiais a partir das partes e hierarquia
  const derivedGearTypes = deriveGearTypes(OFFICIAL_GEAR_TYPES, projectRoot);

  // 3. Exportar modpacks (com commit oficial e tipos derivados)
  exportCatalog('atm11', materials, outDir, ATM11_COMMIT, derivedGearTypes);
  exportCatalog('atm10', materials, outDir, ATM11_COMMIT, derivedGearTypes);
  exportCatalog('atm9', materials, outDir, ATM11_COMMIT, derivedGearTypes);

  // 4. Exportar TSV dump em output/silentgear/material_export.tsv
  const tsvPath = path.join(projectRoot, 'output/silentgear/material_export.tsv');
  generateTsvDump(materials, tsvPath);

  console.log('[extract-official-data] Todos os catálogos oficiais gerados com sucesso!');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
