import * as fs from 'fs';
import * as path from 'path';
import {
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

export function normalizeColor(color: string | undefined): string {
  if (!color || typeof color !== 'string') return '#FFFFFF';
  let c = color.trim().toUpperCase();
  if (c.startsWith('#') && c.length === 9) {
    // #AARRGGBB -> #RRGGBB
    c = '#' + c.slice(3);
  }
  return c;
}

export function parseStatEntry(val: any): StatModifierEntry | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'number') return val;
  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      return val.map((item) => ({
        value: typeof item.value === 'number' ? item.value : parseFloat(item.value) || 0,
        operation: item.operation as StatOperation,
      }));
    }
    return {
      value: typeof val.value === 'number' ? val.value : parseFloat(val.value) || 0,
      operation: val.operation as StatOperation,
    };
  }
  const parsed = parseFloat(val);
  return isNaN(parsed) ? undefined : parsed;
}

export function formatMaterialName(baseName: string): { en: string; pt: string } {
  const enTranslations: Record<string, string> = {
    allthemodium: 'Allthemodium',
    vibranium: 'Vibranium',
    unobtainium: 'Unobtainium',
    uru_metal: 'Uru Metal',
    tyrian_steel: 'Tyrian Steel',
    crimson_iron: 'Crimson Iron',
    crimson_steel: 'Crimson Steel',
    azure_silver: 'Azure Silver',
    azure_electrum: 'Azure Electrum',
    breeze_rod: 'Breeze Rod',
  };

  const ptTranslations: Record<string, string> = {
    allthemodium: 'Allthemodium',
    vibranium: 'Vibranium',
    unobtainium: 'Unobtainium',
    uru_metal: 'Metal Uru',
    tyrian_steel: 'Aço Tiriano',
    iron: 'Ferro',
    diamond: 'Diamante',
    netherite: 'Netherita',
    gold: 'Ouro',
    copper: 'Cobre',
    wood: 'Madeira',
    stone: 'Pedra',
    wool: 'Lã',
    crimson_iron: 'Ferro Carmesim',
    crimson_steel: 'Aço Carmesim',
    azure_silver: 'Prata Lazúli',
    azure_electrum: 'Electro Lazúli',
    breeze_rod: 'Haste de Brisa',
  };

  const formattedEn =
    enTranslations[baseName] ||
    baseName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const formattedPt = ptTranslations[baseName] || formattedEn;

  return { en: formattedEn, pt: formattedPt };
}

export function parseMaterialFile(filePath: string): Material {
  const content = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(content);

  const normalizedPath = filePath.replace(/\\/g, '/');
  const match = normalizedPath.match(/\/([^\/]+)\/silentgear_materials\/([^\/]+)\.json$/);
  const namespace = match ? match[1] : 'silentgear';
  const baseName = match ? match[2] : path.basename(filePath, '.json');
  const id = `${namespace}:${baseName}`;

  const rawColor = json.display?.color || json.model?.color || '#D8D8D8';
  const color = normalizeColor(rawColor);

  const rawCategories: string[] =
    json.crafting?.categories || json.availability?.categories || ['metal'];
  const category = (rawCategories[0] || 'metal') as MaterialCategory;
  const categories = rawCategories;

  const rawProps = json.properties || {};
  const rawStats = json.stats || {};

  const slotMap: Record<string, PartSlot> = {
    'silentgear:main': 'main',
    main: 'main',
    'silentgear:rod': 'rod',
    rod: 'rod',
    'silentgear:tip': 'tip',
    tip: 'tip',
    'silentgear:coating': 'coating',
    coating: 'coating',
    'silentgear:grip': 'grip',
    grip: 'grip',
    'silentgear:lining': 'lining',
    lining: 'lining',
    'silentgear:binding': 'binding',
    binding: 'binding',
  };

  const stats: Partial<Record<PartSlot, any>> = {};
  const traits: Partial<Record<PartSlot, any>> = {};

  for (const [propKey, slotName] of Object.entries(slotMap)) {
    const slotData = rawProps[propKey] || rawStats[slotName];
    if (!slotData) continue;
    if (stats[slotName]) continue;

    const slotStats: any = {};
    if (slotData.durability !== undefined) slotStats.durability = parseStatEntry(slotData.durability);
    if (slotData.armor !== undefined) slotStats.armor = parseStatEntry(slotData.armor);
    if (slotData.armor_durability !== undefined) slotStats.armor_durability = parseStatEntry(slotData.armor_durability);
    if (slotData.armor_toughness !== undefined) slotStats.armor_toughness = parseStatEntry(slotData.armor_toughness);
    if (slotData.magic_armor !== undefined) slotStats.magic_armor = parseStatEntry(slotData.magic_armor);
    if (slotData.knockback_resistance !== undefined) slotStats.knockback_resistance = parseStatEntry(slotData.knockback_resistance);

    if (slotData.attack_damage !== undefined) slotStats.melee_damage = parseStatEntry(slotData.attack_damage);
    else if (slotData.melee_damage !== undefined) slotStats.melee_damage = parseStatEntry(slotData.melee_damage);

    if (slotData.attack_speed !== undefined) slotStats.attack_speed = parseStatEntry(slotData.attack_speed);
    if (slotData.harvest_speed !== undefined) slotStats.harvest_speed = parseStatEntry(slotData.harvest_speed);
    if (slotData.ranged_damage !== undefined) slotStats.ranged_damage = parseStatEntry(slotData.ranged_damage);
    if (slotData.rarity !== undefined) slotStats.rarity = parseStatEntry(slotData.rarity);
    if (slotData.enchantment_value !== undefined) slotStats.enchantment_value = parseStatEntry(slotData.enchantment_value);
    if (slotData.charging_value !== undefined) slotStats.charging_value = parseStatEntry(slotData.charging_value);

    if (typeof slotData.harvest_tier === 'object' && slotData.harvest_tier) {
      slotStats.harvest_tier = slotData.harvest_tier.name || slotData.harvest_tier.incorrect_blocks_for_tool;
    } else if (typeof slotData.harvest_tier === 'string') {
      slotStats.harvest_tier = slotData.harvest_tier;
    }

    const armorByPiece: any = {};
    if (slotData['armor/helmet'] !== undefined) armorByPiece.helmet = parseStatEntry(slotData['armor/helmet']);
    if (slotData['armor/chestplate'] !== undefined) armorByPiece.chestplate = parseStatEntry(slotData['armor/chestplate']);
    if (slotData['armor/leggings'] !== undefined) armorByPiece.leggings = parseStatEntry(slotData['armor/leggings']);
    if (slotData['armor/boots'] !== undefined) armorByPiece.boots = parseStatEntry(slotData['armor/boots']);

    if (Object.keys(armorByPiece).length > 0) {
      slotStats.armor_by_piece = armorByPiece;
    }

    stats[slotName] = slotStats;

    if (Array.isArray(slotData.traits)) {
      traits[slotName] = slotData.traits.map((t: any) => ({
        name: t.trait || t.name,
        level: typeof t.level === 'number' ? t.level : 1,
      }));
    }
  }

  const names = formatMaterialName(baseName);

  return {
    id,
    name: names,
    tier: stats.main?.harvest_tier ? 2 : 1,
    category,
    categories,
    color,
    stats,
    traits,
  };
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

  return materials;
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
    const parent = '';
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

export function exportCatalog(
  version: string,
  materials: Record<string, Material>,
  targetDir: string,
  sourceCommit?: string
) {
  const catalog: VersionCatalog = {
    version,
    ...(sourceCommit && { sourceCommit }),
    materials,
    gearTypes: OFFICIAL_GEAR_TYPES,
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

  // 2. Exportar modpack ATM-11 (com commit oficial)
  exportCatalog('atm11', materials, outDir, ATM11_COMMIT);
  exportCatalog('atm10', materials, outDir, ATM11_COMMIT);
  exportCatalog('atm9', materials, outDir, ATM11_COMMIT);

  // 3. Exportar TSV dump em output/silentgear/material_export.tsv
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
