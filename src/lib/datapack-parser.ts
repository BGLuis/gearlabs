import JSZip from 'jszip';
import {
  ArmorPiece,
  Material,
  MaterialCategory,
  MaterialStats,
  MaterialTraitRef,
  PartSlot,
  StatModifierEntry,
  VersionCatalog,
} from '@/types/silentgear';
import { OFFICIAL_GEAR_TYPES, OFFICIAL_TRAITS, OFFICIAL_MATERIALS_1_20 } from '@/data/defaultCatalog';

export const ALL_SLOTS: PartSlot[] = ['main', 'rod', 'tip', 'coating', 'lining', 'grip', 'binding'];

export const NESTED_MATERIAL_TRANSLATIONS: Record<string, { en: string; pt: string }> = {
  // Madeiras
  'wood/oak': { en: 'Oak Wood', pt: 'Madeira de Carvalho' },
  'wood/birch': { en: 'Birch Wood', pt: 'Madeira de Bétula' },
  'wood/spruce': { en: 'Spruce Wood', pt: 'Madeira de Pinheiro' },
  'wood/jungle': { en: 'Jungle Wood', pt: 'Madeira da Selva' },
  'wood/acacia': { en: 'Acacia Wood', pt: 'Madeira de Acácia' },
  'wood/dark_oak': { en: 'Dark Oak Wood', pt: 'Madeira de Carvalho Escuro' },
  'wood/crimson': { en: 'Crimson Wood', pt: 'Madeira Carmesim' },
  'wood/warped': { en: 'Warped Wood', pt: 'Madeira Distorcida' },

  // Pedras
  'stone/granite': { en: 'Granite', pt: 'Granito' },
  'stone/diorite': { en: 'Diorite', pt: 'Diorito' },
  'stone/andesite': { en: 'Andesite', pt: 'Andesito' },

  // Arenito
  'sandstone/red': { en: 'Red Sandstone', pt: 'Arenito Vermelho' },

  // Lãs
  'wool/white': { en: 'White Wool', pt: 'Lã Branca' },
  'wool/orange': { en: 'Orange Wool', pt: 'Lã Laranja' },
  'wool/magenta': { en: 'Magenta Wool', pt: 'Lã Magenta' },
  'wool/light_blue': { en: 'Light Blue Wool', pt: 'Lã Azul Clara' },
  'wool/yellow': { en: 'Yellow Wool', pt: 'Lã Amarela' },
  'wool/lime': { en: 'Lime Wool', pt: 'Lã Verde Limão' },
  'wool/pink': { en: 'Pink Wool', pt: 'Lã Rosa' },
  'wool/gray': { en: 'Gray Wool', pt: 'Lã Cinza' },
  'wool/light_gray': { en: 'Light Gray Wool', pt: 'Lã Cinza Clara' },
  'wool/cyan': { en: 'Cyan Wool', pt: 'Lã Ciano' },
  'wool/purple': { en: 'Purple Wool', pt: 'Lã Roxa' },
  'wool/blue': { en: 'Blue Wool', pt: 'Lã Azul' },
  'wool/brown': { en: 'Brown Wool', pt: 'Lã Marrom' },
  'wool/green': { en: 'Green Wool', pt: 'Lã Verde' },
  'wool/red': { en: 'Red Wool', pt: 'Lã Vermelha' },
  'wool/black': { en: 'Black Wool', pt: 'Lã Preta' },

  // Terracotas
  'terracotta/white': { en: 'White Terracotta', pt: 'Terracota Branca' },
  'terracotta/orange': { en: 'Orange Terracotta', pt: 'Terracota Laranja' },
  'terracotta/magenta': { en: 'Magenta Terracotta', pt: 'Terracota Magenta' },
  'terracotta/light_blue': { en: 'Light Blue Terracotta', pt: 'Terracota Azul Clara' },
  'terracotta/yellow': { en: 'Yellow Terracotta', pt: 'Terracota Amarela' },
  'terracotta/lime': { en: 'Lime Terracotta', pt: 'Terracota Verde Limão' },
  'terracotta/pink': { en: 'Pink Terracotta', pt: 'Terracota Rosa' },
  'terracotta/gray': { en: 'Gray Terracotta', pt: 'Terracota Cinza' },
  'terracotta/light_gray': { en: 'Light Gray Terracotta', pt: 'Terracota Cinza Clara' },
  'terracotta/cyan': { en: 'Cyan Terracotta', pt: 'Terracota Ciano' },
  'terracotta/purple': { en: 'Purple Terracotta', pt: 'Terracota Roxa' },
  'terracotta/blue': { en: 'Blue Terracotta', pt: 'Terracota Azul' },
  'terracotta/brown': { en: 'Brown Terracotta', pt: 'Terracota Marrom' },
  'terracotta/green': { en: 'Green Terracotta', pt: 'Terracota Verde' },
  'terracotta/red': { en: 'Red Terracotta', pt: 'Terracota Vermelha' },
  'terracotta/black': { en: 'Black Terracotta', pt: 'Terracota Preta' },

  // Nomes canônicos gerais
  allthemodium: { en: 'Allthemodium', pt: 'Allthemodium' },
  vibranium: { en: 'Vibranium', pt: 'Vibranium' },
  unobtainium: { en: 'Unobtainium', pt: 'Unobtainium' },
  uru_metal: { en: 'Uru Metal', pt: 'Metal Uru' },
  tyrian_steel: { en: 'Tyrian Steel', pt: 'Aço Tiriano' },
  crimson_iron: { en: 'Crimson Iron', pt: 'Ferro Carmesim' },
  crimson_steel: { en: 'Crimson Steel', pt: 'Aço Carmesim' },
  azure_silver: { en: 'Azure Silver', pt: 'Prata Lazúli' },
  azure_electrum: { en: 'Azure Electrum', pt: 'Electro Lazúli' },
  breeze_rod: { en: 'Breeze Rod', pt: 'Haste de Brisa' },
  iron: { en: 'Iron', pt: 'Ferro' },
  diamond: { en: 'Diamond', pt: 'Diamante' },
  netherite: { en: 'Netherite', pt: 'Netherita' },
  gold: { en: 'Gold', pt: 'Ouro' },
  copper: { en: 'Copper', pt: 'Cobre' },
  wood: { en: 'Wood', pt: 'Madeira' },
  stone: { en: 'Stone', pt: 'Pedra' },
  wool: { en: 'Wool', pt: 'Lã' },
  terracotta: { en: 'Terracotta', pt: 'Terracota' },
  sandstone: { en: 'Sandstone', pt: 'Arenito' },
};

export function formatMaterialName(subPath: string): { en: string; pt: string } {
  const normalized = subPath.replace(/\\/g, '/').toLowerCase();
  if (NESTED_MATERIAL_TRANSLATIONS[normalized]) {
    return NESTED_MATERIAL_TRANSLATIONS[normalized];
  }

  // Fallback para nomes arbitrários
  const parts = normalized.split('/');
  const formatted = parts
    .map((p) => p.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(' - ');

  return { en: formatted, pt: formatted };
}

export function normalizeColor(color: string | undefined): string {
  if (!color || typeof color !== 'string') return '#FFFFFF';
  let c = color.trim().toUpperCase();
  if (c.startsWith('#') && c.length === 9) {
    // #AARRGGBB -> #RRGGBB
    c = '#' + c.slice(3);
  }
  return c;
}

/**
 * Extrai o ID com namespace a partir do caminho do arquivo no datapack.
 * Exemplos:
 *  - "data/silentgear/silentgear_materials/allthemodium.json" -> "silentgear:allthemodium"
 *  - "kubejs/dynamic_data/silentgear/silentgear_materials/allthemodium.json" -> "silentgear:allthemodium"
 *  - "data/sgearmetalworks/silentgear_materials/uru_metal.json" -> "sgearmetalworks:uru_metal"
 *  - "data/silentgear/silentgear_materials/wood/oak.json" -> "silentgear:wood/oak"
 *  - "data/silentgear/silentgear_materials/wool/white.json" -> "silentgear:wool/white"
 */
export function extractMaterialIdFromPath(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, '/');
  const match = normalized.match(/(?:^|\/)([^/]+)\/silentgear_materials\/(.+)\.json$/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  return null;
}

/**
 * Normaliza um valor de estatística sem inventar padrões.
 * Preserva números (incluindo 0), modificadores com operação ({ value, operation })
 * e listas de modificadores.
 */
export function parseStatValueEntry(val: any): StatModifierEntry | undefined {
  if (val === undefined || val === null) return undefined;

  if (typeof val === 'number') {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => {
      if (typeof item === 'number') {
        return { value: item, operation: 'ADD' };
      }
      return {
        value: item.value,
        operation: item.operation,
      };
    });
  }

  if (typeof val === 'object' && 'value' in val) {
    return {
      value: val.value,
      operation: val.operation,
    };
  }

  return undefined;
}

/**
 * Processa as propriedades brutas de um slot (main, rod, coating, etc.)
 * mapeando todas as estatísticas sem criar valores artificiais.
 */
function parseSlotStats(slotData: any): MaterialStats {
  const stats: MaterialStats = {};

  const durability = parseStatValueEntry(slotData.durability);
  if (durability !== undefined) stats.durability = durability;

  const armor = parseStatValueEntry(slotData.armor);
  if (armor !== undefined) stats.armor = armor;

  const armorDurability = parseStatValueEntry(slotData.armor_durability);
  if (armorDurability !== undefined) stats.armor_durability = armorDurability;

  const armorToughness = parseStatValueEntry(slotData.armor_toughness);
  if (armorToughness !== undefined) stats.armor_toughness = armorToughness;

  const magicArmor = parseStatValueEntry(slotData.magic_armor);
  if (magicArmor !== undefined) stats.magic_armor = magicArmor;

  const knockbackResistance = parseStatValueEntry(slotData.knockback_resistance);
  if (knockbackResistance !== undefined) stats.knockback_resistance = knockbackResistance;

  const meleeDamage = parseStatValueEntry(slotData.attack_damage ?? slotData.melee_damage);
  if (meleeDamage !== undefined) stats.melee_damage = meleeDamage;

  const attackSpeed = parseStatValueEntry(slotData.attack_speed);
  if (attackSpeed !== undefined) stats.attack_speed = attackSpeed;

  const harvestSpeed = parseStatValueEntry(slotData.harvest_speed);
  if (harvestSpeed !== undefined) stats.harvest_speed = harvestSpeed;

  const rangedDamage = parseStatValueEntry(slotData.ranged_damage);
  if (rangedDamage !== undefined) stats.ranged_damage = rangedDamage;

  const rangedSpeed = parseStatValueEntry(slotData.ranged_speed);
  if (rangedSpeed !== undefined) stats.ranged_speed = rangedSpeed;

  const rarity = parseStatValueEntry(slotData.rarity);
  if (rarity !== undefined) stats.rarity = rarity;

  const synergy = parseStatValueEntry(slotData.synergy);
  if (synergy !== undefined) stats.synergy = synergy;

  const enchantmentValue = parseStatValueEntry(slotData.enchantment_value);
  if (enchantmentValue !== undefined) stats.enchantment_value = enchantmentValue;

  const chargingValue = parseStatValueEntry(slotData.charging_value);
  if (chargingValue !== undefined) stats.charging_value = chargingValue;

  // Harvest Tier (suporta objeto com .name, .id ou .incorrect_blocks_for_tool, ou string/número)
  if (typeof slotData.harvest_tier === 'object' && slotData.harvest_tier !== null) {
    stats.harvest_tier =
      slotData.harvest_tier.name ??
      slotData.harvest_tier.id ??
      slotData.harvest_tier.incorrect_blocks_for_tool;
  } else if (typeof slotData.harvest_tier === 'string') {
    stats.harvest_tier = slotData.harvest_tier;
  } else if (typeof slotData.harvest_tier === 'number') {
    stats.harvest_tier = String(slotData.harvest_tier);
  }

  // Armor by piece (armor/helmet, armor/chestplate, armor/leggings, armor/boots)
  const helmet = parseStatValueEntry(slotData['armor/helmet'] ?? slotData.armor_by_piece?.helmet);
  const chestplate = parseStatValueEntry(slotData['armor/chestplate'] ?? slotData.armor_by_piece?.chestplate);
  const leggings = parseStatValueEntry(slotData['armor/leggings'] ?? slotData.armor_by_piece?.leggings);
  const boots = parseStatValueEntry(slotData['armor/boots'] ?? slotData.armor_by_piece?.boots);

  if (helmet !== undefined || chestplate !== undefined || leggings !== undefined || boots !== undefined) {
    const armorByPiece: Partial<Record<ArmorPiece, StatModifierEntry>> = {};
    if (helmet !== undefined) armorByPiece.helmet = helmet;
    if (chestplate !== undefined) armorByPiece.chestplate = chestplate;
    if (leggings !== undefined) armorByPiece.leggings = leggings;
    if (boots !== undefined) armorByPiece.boots = boots;
    stats.armor_by_piece = armorByPiece;
  }

  return stats;
}

/**
 * Função pura que processa o JSON de um material do Silent Gear.
 * Deriva ID canônico via caminho, processa categorias (crafting.categories ou availability.categories),
 * suporta todos os slots e peças de armadura, e preserva valores 0 e modificadores com operação.
 */
export function parseMaterialJson(filePath: string, json: any): Material | null {
  if (!json || typeof json !== 'object') {
    return null;
  }

  // Ignorar arquivos que não sejam de silentgear_materials se não contiverem propriedades de material
  const isMaterialFolder = filePath.includes('silentgear_materials/');
  if (!isMaterialFolder && !json.properties && !json.stats) {
    return null;
  }

  const normalizedPath = filePath.replace(/\\/g, '/');
  const fullId = extractMaterialIdFromPath(filePath);
  const subPathMatch = normalizedPath.match(/(?:^|\/)[^/]+\/silentgear_materials\/(.+)\.json$/);
  const baseName = normalizedPath.split('/').pop()?.replace('.json', '') || 'custom';
  const subPath = subPathMatch ? subPathMatch[1] : (fullId ? fullId.replace(/^[^:]+:/, '') : baseName);

  const id = fullId || json.id || `custom:${baseName}`;

  // Categorias: formato 1.21+ usa crafting.categories, 1.20 usa availability.categories
  const rawCategories = json.crafting?.categories ?? json.availability?.categories;
  const categories: string[] = Array.isArray(rawCategories)
    ? rawCategories.map((c) => String(c))
    : rawCategories !== undefined
    ? [String(rawCategories)]
    : [];
  const category = (categories[0] || 'metal') as MaterialCategory;

  // Cor (suporta #RRGGBB ou #AARRGGBB)
  const color = normalizeColor(json.display?.color || json.model?.color || '#D8D8D8');

  // Nome (inglês e português)
  const defaultNames = formatMaterialName(subPath);
  const nameEn =
    (typeof json.name === 'string' ? json.name : null) ??
    json.name?.en ??
    (typeof json.display?.name === 'string' ? json.display.name : null) ??
    json.display?.name?.en ??
    defaultNames.en;
  const namePt =
    (typeof json.name === 'string' ? json.name : null) ??
    json.name?.pt ??
    (typeof json.display?.name === 'string' ? json.display.name : null) ??
    json.display?.name?.pt ??
    defaultNames.pt;

  // Stats e Traits por slot
  const rawStats = json.stats || {};
  const rawProps = json.properties || {};

  const stats: Partial<Record<PartSlot, MaterialStats>> = {};
  const traits: Partial<Record<PartSlot, MaterialTraitRef[]>> = {};

  for (const slot of ALL_SLOTS) {
    const slotData = rawProps[`silentgear:${slot}`] ?? rawProps[slot] ?? rawStats[slot];
    if (slotData) {
      stats[slot] = parseSlotStats(slotData);

      if (Array.isArray(slotData.traits)) {
        traits[slot] = slotData.traits.map((t: any) => ({
          name: t.trait ?? t.name,
          level: typeof t.level === 'number' ? t.level : 1,
        }));
      }
    }
  }

  // Nível / Tier
  const tier = json.availability?.tier ?? json.tier ?? (stats.main?.harvest_tier ? 2 : 1);

  const material: Material = {
    id,
    name: {
      en: nameEn,
      pt: namePt,
    },
    tier,
    category,
    categories,
    color,
    stats,
    traits,
  };

  if (json.parent && json.parent !== 'silentgear:empty') {
    material.parent = json.parent;
  }

  return material;
}

/**
 * Resolve a herança de materiais que possuem 'parent' definido conforme Silent Gear 4.2.3 (AbstractMaterial.java).
 *
 * Regras:
 * 1. Categorias: se as categorias do filho forem vazias ([]), herda categorias do pai.
 * 2. Stats por slot: se o filho não tiver o slot, herda integralmente do pai. Se ambos tiverem,
 *    mescla propriedade por propriedade (o filho sobrepõe, e propriedades faltantes caem para as do pai).
 * 3. Traits por slot: se o filho definiu traits para o slot (mesmo que específicos), mantém os do filho;
 *    se não definiu o slot nos traits, herda do pai.
 * 4. Tier: se ausente/padrão, herda do pai caso este possua.
 * 5. Ciclos e referências ausentes são tratados com segurança sem crash.
 */
export function resolveMaterialParents(
  materials: Record<string, Material>,
  fallbackMaterials: Record<string, Material> = {}
): Record<string, Material> {
  const allAvailable = { ...fallbackMaterials, ...materials };
  const resolved: Record<string, Material> = {};
  const resolving = new Set<string>();

  function resolve(id: string): Material | undefined {
    if (resolved[id]) return resolved[id];
    const raw = allAvailable[id];
    if (!raw) return undefined;

    const parentId = raw.parent;
    if (!parentId || parentId === 'silentgear:empty' || parentId === id) {
      resolved[id] = { ...raw };
      return resolved[id];
    }

    if (resolving.has(id)) {
      console.warn(`[datapack-parser] Ciclo detectado na hierarquia de parent: ${id}`);
      resolved[id] = { ...raw };
      return resolved[id];
    }

    resolving.add(id);
    const parentMat = resolve(parentId);
    resolving.delete(id);

    if (!parentMat) {
      resolved[id] = { ...raw };
      return resolved[id];
    }

    // 1. Categorias: se vazio no filho, herda do pai
    const childHasCategories = raw.categories && raw.categories.length > 0;
    const categories = childHasCategories
      ? raw.categories!
      : (parentMat.categories && parentMat.categories.length > 0
          ? parentMat.categories
          : [parentMat.category]);
    const category = childHasCategories ? raw.category : parentMat.category;

    // 2. Mesclar stats e traits por slot
    const mergedStats: Partial<Record<PartSlot, MaterialStats>> = {};
    const mergedTraits: Partial<Record<PartSlot, MaterialTraitRef[]>> = {};

    const allSlots = new Set<PartSlot>([
      ...(Object.keys(parentMat.stats || {}) as PartSlot[]),
      ...(Object.keys(raw.stats || {}) as PartSlot[]),
      ...(Object.keys(parentMat.traits || {}) as PartSlot[]),
      ...(Object.keys(raw.traits || {}) as PartSlot[]),
    ]);

    for (const slot of allSlots) {
      const parentSlotStats = parentMat.stats?.[slot];
      const childSlotStats = raw.stats?.[slot];

      if (!childSlotStats && parentSlotStats) {
        mergedStats[slot] = {
          ...parentSlotStats,
          ...(parentSlotStats.armor_by_piece && {
            armor_by_piece: { ...parentSlotStats.armor_by_piece },
          }),
        };
      } else if (childSlotStats && !parentSlotStats) {
        mergedStats[slot] = {
          ...childSlotStats,
          ...(childSlotStats.armor_by_piece && {
            armor_by_piece: { ...childSlotStats.armor_by_piece },
          }),
        };
      } else if (childSlotStats && parentSlotStats) {
        const combined: MaterialStats = {
          ...parentSlotStats,
          ...childSlotStats,
        };
        if (parentSlotStats.armor_by_piece || childSlotStats.armor_by_piece) {
          combined.armor_by_piece = {
            ...(parentSlotStats.armor_by_piece || {}),
            ...(childSlotStats.armor_by_piece || {}),
          };
        }
        mergedStats[slot] = combined;
      }

      // Traits: filho sobrescreve pai se definiu explicitamente para o slot
      const parentSlotTraits = parentMat.traits?.[slot];
      const childSlotTraits = raw.traits?.[slot];

      if (childSlotTraits !== undefined) {
        mergedTraits[slot] = [...childSlotTraits];
      } else if (parentSlotTraits) {
        mergedTraits[slot] = [...parentSlotTraits];
      }
    }

    // Tier: herda do pai se o filho não possuir harvest_tier próprio
    const tier = raw.tier ?? parentMat.tier ?? (mergedStats.main?.harvest_tier ? 2 : 1);

    const result: Material = {
      ...raw,
      category,
      categories,
      tier,
      stats: mergedStats,
      traits: mergedTraits,
    };

    resolved[id] = result;
    return result;
  }

  const finalMaterials: Record<string, Material> = {};
  for (const id of Object.keys(materials)) {
    finalMaterials[id] = resolve(id) || materials[id];
  }

  return finalMaterials;
}

/**
 * Lê um arquivo ZIP de datapack e extrai todos os materiais registrados.
 * Filtra estritamente arquivos dentro de silentgear_materials/*.json.
 */
export async function parseDatapackZip(file: File): Promise<VersionCatalog> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  const materials: Record<string, Material> = {};

  const files = Object.keys(loadedZip.files);
  const materialFiles = files.filter(
    (name) =>
      !loadedZip.files[name].dir &&
      name.includes('silentgear_materials/') &&
      name.endsWith('.json')
  );

  for (const filePath of materialFiles) {
    try {
      const content = await loadedZip.files[filePath].async('text');
      const json = JSON.parse(content);
      const material = parseMaterialJson(filePath, json);
      if (material) {
        materials[material.id] = material;
      }
    } catch (e) {
      console.warn(`[datapack-parser] Failed to parse ${filePath}:`, e);
    }
  }

  const resolvedMaterials = resolveMaterialParents(materials, OFFICIAL_MATERIALS_1_20);

  return {
    version: 'custom',
    materials: resolvedMaterials,
    gearTypes: OFFICIAL_GEAR_TYPES,
    traits: OFFICIAL_TRAITS,
  };
}

/**
 * Interpreta o valor textual de uma célula de modificador/estatística exportada pelo TSV.
 * Suporta formatos numéricos, modificadores com prefixo (+4, ADD 4, ^5, +15%, x1.5).
 */
export function parseTsvCellValue(raw: string): StatModifierEntry | undefined {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-') return undefined;

  // ADD explícito: "+4", "+4.0", "ADD 4"
  const addMatch = trimmed.match(/^(?:\+|ADD\s+)([-+]?\d+(?:\.\d+)?)$/i);
  if (addMatch) {
    return { value: parseFloat(addMatch[1]), operation: 'ADD' };
  }

  // ADD negativo: "-2", "-2.0"
  const negMatch = trimmed.match(/^-(\d+(?:\.\d+)?)$/);
  if (negMatch) {
    return { value: -parseFloat(negMatch[1]), operation: 'ADD' };
  }

  // MAX: "^5", "↑5", "MAX 5"
  const maxMatch = trimmed.match(/^(?:\^|↑|MAX\s+)([-+]?\d+(?:\.\d+)?)$/i);
  if (maxMatch) {
    return { value: parseFloat(maxMatch[1]), operation: 'MAX' };
  }

  // MULTIPLY_BASE: "+15%", "-20%", "MUL1 0.15"
  const mul1Pct = trimmed.match(/^([-+]?\d+(?:\.\d+)?)\s*%$/);
  if (mul1Pct) {
    return { value: parseFloat(mul1Pct[1]) / 100, operation: 'MULTIPLY_BASE' };
  }
  const mul1Match = trimmed.match(/^MUL1\s+([-+]?\d+(?:\.\d+)?)$/i);
  if (mul1Match) {
    return { value: parseFloat(mul1Match[1]), operation: 'MULTIPLY_BASE' };
  }

  // MULTIPLY_TOTAL: "x1.5", "MUL2 1.5"
  const mul2Match = trimmed.match(/^x([-+]?\d+(?:\.\d+)?)$/i);
  if (mul2Match) {
    return { value: parseFloat(mul2Match[1]) - 1.0, operation: 'MULTIPLY_TOTAL' };
  }
  const mul2Explicit = trimmed.match(/^MUL2\s+([-+]?\d+(?:\.\d+)?)$/i);
  if (mul2Explicit) {
    return { value: parseFloat(mul2Explicit[1]), operation: 'MULTIPLY_TOTAL' };
  }

  // Número simples: "60", "5500", "60x"
  const plainNum = trimmed.replace(/x$/, '');
  const num = Number(plainNum);
  if (!Number.isNaN(num)) {
    return num;
  }

  return trimmed as any;
}

function parsePartSlotFromTypeName(typeName: string): PartSlot {
  const lower = typeName.trim().toLowerCase();
  if (lower === 'main') return 'main';
  if (lower === 'rod' || lower === 'tool rod') return 'rod';
  if (lower === 'tip' || lower === 'tip upgrade') return 'tip';
  if (lower === 'coating') return 'coating';
  if (lower === 'lining') return 'lining';
  if (lower === 'grip') return 'grip';
  if (lower === 'binding') return 'binding';
  return 'main';
}

const TSV_PROPERTY_MAP: Record<string, keyof MaterialStats> = {
  durability: 'durability',
  'armor durability': 'armor_durability',
  armor_durability: 'armor_durability',
  armor: 'armor',
  'armor toughness': 'armor_toughness',
  armor_toughness: 'armor_toughness',
  'magic armor': 'magic_armor',
  magic_armor: 'magic_armor',
  'knockback resistance': 'knockback_resistance',
  knockback_resistance: 'knockback_resistance',
  'attack damage': 'melee_damage',
  attack_damage: 'melee_damage',
  'attack speed': 'attack_speed',
  attack_speed: 'attack_speed',
  'harvest speed': 'harvest_speed',
  harvest_speed: 'harvest_speed',
  'harvest tier': 'harvest_tier',
  harvest_tier: 'harvest_tier',
  'ranged damage': 'ranged_damage',
  ranged_damage: 'ranged_damage',
  'ranged speed': 'ranged_speed',
  ranged_speed: 'ranged_speed',
  rarity: 'rarity',
  synergy: 'synergy',
  'enchantment value': 'enchantment_value',
  enchantment_value: 'enchantment_value',
  'charging value': 'charging_value',
  charging_value: 'charging_value',
};

/**
 * Lê o conteúdo de exportação TSV gerado pelo comando `/sgear_mats dump`.
 * O formato oficial contém:
 *   Pack, Name, Type, ID, Parent, Categories, <Properties...>
 * com múltiplas linhas para um mesmo ID de material (uma linha para cada Type/slot).
 */
export function parseDumpTsv(tsvText: string): VersionCatalog {
  const lines = tsvText.split('\n').filter((l) => l.trim().length > 0);
  const materials: Record<string, Material> = {};

  if (lines.length < 2) {
    return {
      version: 'custom',
      materials,
      gearTypes: OFFICIAL_GEAR_TYPES,
      traits: OFFICIAL_TRAITS,
    };
  }

  const headerCols = lines[0].split('\t').map((c) => c.trim().toLowerCase());
  const typeIdx = headerCols.indexOf('type');
  const idIdx = headerCols.indexOf('id');
  const nameIdx = headerCols.indexOf('name');
  const catIdx = headerCols.indexOf('categories');

  // Formato oficial do Silent Gear
  if (typeIdx !== -1 && idIdx !== -1) {
    // Mapear índices das colunas de propriedades
    const colProperties: Array<{ colIdx: number; statKey: keyof MaterialStats }> = [];
    headerCols.forEach((colName, idx) => {
      const statKey = TSV_PROPERTY_MAP[colName];
      if (statKey) {
        colProperties.push({ colIdx: idx, statKey });
      }
    });

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t');
      if (cols.length <= idIdx) continue;

      const id = cols[idIdx]?.trim();
      if (!id) continue;

      const typeName = cols[typeIdx]?.trim() || 'Main';
      const slot = parsePartSlotFromTypeName(typeName);
      const name = (nameIdx !== -1 ? cols[nameIdx]?.trim() : '') || id.replace(/^.*:/, '');
      const rawCategories = (catIdx !== -1 ? cols[catIdx]?.trim() : '') || 'metal';
      const categories = rawCategories
        .split(',')
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean);

      if (!materials[id]) {
        materials[id] = {
          id,
          name: { en: name, pt: name },
          tier: 1,
          category: (categories[0] || 'metal') as MaterialCategory,
          categories: categories.length > 0 ? categories : ['metal'],
          color: '#A0A0A0',
          stats: {},
          traits: {},
        };
      }

      const slotStats: MaterialStats = materials[id].stats[slot] || {};

      for (const { colIdx, statKey } of colProperties) {
        if (colIdx < cols.length) {
          const cell = cols[colIdx]?.trim();
          if (cell) {
            if (statKey === 'harvest_tier') {
              slotStats.harvest_tier = cell;
            } else {
              const parsedVal = parseTsvCellValue(cell);
              if (parsedVal !== undefined) {
                (slotStats as any)[statKey] = parsedVal;
              }
            }
          }
        }
      }

      materials[id].stats[slot] = slotStats;
    }
  } else {
    // Fallback para TSV legado de 4 colunas simples (id, tier, durability, damage)
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t');
      if (cols.length < 3) continue;

      const id = cols[0].trim();
      const tier = parseInt(cols[1], 10) || 1;
      const durability = parseFloat(cols[2]) || 250;
      const damage = parseFloat(cols[3]) || 2.0;

      materials[id] = {
        id,
        name: { en: id.replace(/^.*:/, ''), pt: id.replace(/^.*:/, '') },
        tier,
        category: 'metal',
        color: '#A0A0A0',
        stats: {
          main: {
            durability,
            melee_damage: damage,
            harvest_speed: 6.0,
          },
        },
        traits: {},
      };
    }
  }

  return {
    version: 'custom',
    materials,
    gearTypes: OFFICIAL_GEAR_TYPES,
    traits: OFFICIAL_TRAITS,
  };
}
