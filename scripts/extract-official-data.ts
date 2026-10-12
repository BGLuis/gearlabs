import * as fs from 'fs';
import * as path from 'path';
import {
  AddonConfig,
  CatalogLayer,
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
  parseHarvestTier,
} from '../src/lib/datapack-parser';
import { getGearTypeAncestors } from '../src/lib/gear-type-hierarchy';
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
  gearTypes: Record<string, GearType> = OFFICIAL_GEAR_TYPES,
  baseMaterials?: Record<string, Material>,
  layers?: Record<string, CatalogLayer>,
  addons?: AddonConfig[]
) {
  const catalog: VersionCatalog = {
    version,
    ...(sourceCommit && { sourceCommit }),
    materials,
    ...(baseMaterials && { baseMaterials }),
    ...(layers && { layers }),
    ...(addons && { addons }),
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

  // 1. Extração estruturada a partir da base e camadas
  const { baseMaterials, layers, resolvedMaterials } = extractOfficialCatalogData(projectRoot);
  console.log(
    `[extract-official-data] Extraídos ${Object.keys(baseMaterials).length} materiais base e ${Object.keys(resolvedMaterials).length} materiais resolvidos.`
  );

  // 2. Derivar slots oficiais a partir das partes e hierarquia
  const derivedGearTypes = deriveGearTypes(OFFICIAL_GEAR_TYPES, projectRoot);

  // 3. Exportar modpacks (com addons, camadas e commit oficial)
  exportCatalog('atm11', resolvedMaterials, outDir, ATM11_COMMIT, derivedGearTypes, baseMaterials, layers, ATM_ADDONS);
  exportCatalog('atm10', resolvedMaterials, outDir, ATM11_COMMIT, derivedGearTypes, baseMaterials, layers, ATM_ADDONS);
  exportCatalog('atm9', resolvedMaterials, outDir, ATM11_COMMIT, derivedGearTypes, baseMaterials, layers, ATM_ADDONS);

  // 4. Exportar versão oficial 1.21.1 (apenas base Silent Gear, sem addons)
  exportCatalog('1.21.1', baseMaterials, outDir, SILENT_GEAR_COMMIT, derivedGearTypes, baseMaterials, {}, []);

  // 5. Exportar TSV dump em output/silentgear/material_export.tsv
  const tsvPath = path.join(projectRoot, 'output/silentgear/material_export.tsv');
  generateTsvDump(resolvedMaterials, tsvPath);

  console.log('[extract-official-data] Todos os catálogos oficiais gerados com sucesso!');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
