import {
  CalculatedGearStats,
  CalculatedTrait,
  GearBuild,
  GearType,
  GRADE_MULTIPLIERS,
  Material,
  MaterialStats,
  MaterialTraitRef,
  PartSlot,
  StatModifier,
  StatModifierEntry,
  StatOperation,
  StatValueModifier,
  TraitInfo,
  TypedStatProperty,
  VersionCatalog,
  AlloyType,
  Grade,
  StarchargeLevel,
  SubMaterialSelection,
  GearPartSelection,
  PartMaterialInstance,
} from '@/types/silentgear';
import { getPartInstanceCount, syncPartInstancesWithCount } from './parts';
import { getGearTypeAncestors } from './gear-type-hierarchy';

/**
 * Propriedades do Silent Gear afetadas pelo multiplicador de sinergia
 * (baseado em GearProperties.java do Silent Gear 4.2.3).
 */
export const STATS_AFFECTED_BY_SYNERGY = new Set<string>([
  'durability',
  'armor',
  'armor_durability',
  'armor_toughness',
  'magic_armor',
  'knockback_resistance',
  'melee_damage',
  'harvest_speed',
  'ranged_damage',
  'enchantment_value',
  'charging_value',
]);

/**
 * Aplica o multiplicador de sinergia a um valor conforme NumberProperty.java:
 * value + Math.abs(value) * (synergy - 1.0)
 */
export function applySynergyBonus(value: number, synergy: number): number {
  return value + Math.abs(value) * (synergy - 1.0);
}

/**
 * Configuração de efeitos de traits de sinergia ('silentgear:synergy_multiplier', SynergyTraitEffect.java).
 * Aplicados sequencialmente em SynergyUtils.getSynergy após categorias e raridade.
 */
export interface SynergyTraitConfig {
  multiplier: number;
  rangeMin: number;
  rangeMax: number;
}

export const SYNERGY_TRAIT_EFFECTS: Record<string, SynergyTraitConfig> = {
  'silentgear:synergistic': {
    multiplier: 0.04,
    rangeMin: 1.0,
    rangeMax: Number.POSITIVE_INFINITY,
  },
  'silentgear:rustic': {
    multiplier: 0.05,
    rangeMin: 0.749,
    rangeMax: 1.001,
  },
  'silentgear:crude': {
    multiplier: -0.04,
    rangeMin: 0.0,
    rangeMax: Number.POSITIVE_INFINITY,
  },
};

/**
 * Calcula a sinergia de materiais compostos conforme SynergyUtils.java oficial (Silent Gear 4.2.3):
 * - Bônus base da curva de materiais únicos: 1.1 * (x / (x + 1.1)) + 1 / (1 + 1.1)
 * - Penalidade de -0.2 se os materiais não compartilharem ao menos uma categoria em comum
 * - Bônus para categorias compartilhadas: 0.015 * (k / (materiais.length - uniqueCount + 1)) para cada contagem k > 1
 * - Penalidade pela diferença de raridade em relação ao material primário: 0.001 * |primaryRarity - rarity|
 * - Traits com efeito silentgear:synergy_multiplier (synergistic, rustic, crude)
 * - Clamped no intervalo canônico [0.1, 2.0]
 */
export function calculateSynergy(
  materials: Material[],
  partSlot: PartSlot = 'main',
  traits?: MaterialTraitRef[]
): number {
  if (materials.length < 2) return 1.0;

  // 1. Contagem de materiais únicos
  const uniqueMaterialIds = Array.from(new Set(materials.map((m) => m.id)));
  const uniqueCount = uniqueMaterialIds.length;
  const uniqueMaterials = uniqueMaterialIds
    .map((id) => materials.find((m) => m.id === id)!)
    .filter(Boolean);

  // 2. Sinergia base pela curva
  const a = 1.1;
  const x = uniqueCount;
  let synergy = a * (x / (x + a)) + 1.0 / (1.0 + a);

  // 3. Contagem de categorias compartilhadas
  const categoryCounts: Record<string, number> = {};
  for (const mat of materials) {
    const cats = Array.from(new Set([mat.category, ...(mat.categories || [])])).filter(Boolean);
    for (const cat of cats) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }

  // Penalidade se todos os materiais não compartilharem ao menos uma categoria
  const hasSharedCategoryOnAll = Object.values(categoryCounts).some(
    (count) => count === materials.length
  );
  if (!hasSharedCategoryOnAll) {
    synergy -= 0.2; // NO_SHARED_CATEGORY_PENALTY
  }

  // Bônus para categorias compartilhadas entre materiais únicos
  const divisor = materials.length - uniqueCount + 1;
  for (const count of Object.values(categoryCounts)) {
    if (count > 1) {
      synergy += 0.015 * (count / divisor); // SHARED_CATEGORY_BONUS
    }
  }

  // 4. Penalidade de diferença de raridade (conforme SynergyUtils.java:54-65)
  const primary = materials[0];
  const primaryRarity = getNumericStatValue(
    primary.stats[partSlot]?.rarity,
    0
  );
  const maxRarity = Math.max(
    0,
    ...materials.map((m) =>
      getNumericStatValue(m.stats[partSlot]?.rarity, 0)
    )
  );

  if (maxRarity > 0) {
    for (const mat of uniqueMaterials) {
      const rarity = getNumericStatValue(
        mat.stats[partSlot]?.rarity,
        0
      );
      synergy -= 0.001 * Math.abs(primaryRarity - rarity); // RARITY_WEIGHT
    }
  }

  // 5. Traits de sinergia (SynergyUtils.java:67-72 / SynergyTraitEffect.java: silentgear:synergy_multiplier)
  const effectiveTraits = traits ?? materials.flatMap((m) => m.traits[partSlot] || []);
  for (const trait of effectiveTraits) {
    const traitKey = trait.name.startsWith('silentgear:') ? trait.name : `silentgear:${trait.name}`;
    const effect = SYNERGY_TRAIT_EFFECTS[traitKey];
    if (effect) {
      if (synergy > effect.rangeMin && synergy < effect.rangeMax) {
        synergy += trait.level * effect.multiplier;
      }
    }
  }

  // Clamped entre MIN_VALUE (0.1) e MAX_VALUE (2.0)
  return Math.min(2.0, Math.max(0.1, synergy));
}

export function applyGradeBonus(value: number, bonus: number): number {
  return value + Math.abs(value) * bonus;
}

export type NormalizedOperation =
  | 'AVERAGE'
  | 'MAX'
  | 'ADD'
  | 'MULTIPLY_BASE'
  | 'MULTIPLY_TOTAL';

export function normalizeOperation(
  op?: StatOperation,
  defaultOp: NormalizedOperation = 'ADD'
): NormalizedOperation {
  if (!op) return defaultOp;
  const upper = op.toUpperCase();
  if (upper === 'ADD') return 'ADD';
  if (upper === 'AVERAGE' || upper === 'AVG') return 'AVERAGE';
  if (upper === 'MAX') return 'MAX';
  if (upper === 'MULTIPLY_BASE' || upper === 'MUL1') return 'MULTIPLY_BASE';
  if (upper === 'MULTIPLY_TOTAL' || upper === 'MUL2') return 'MULTIPLY_TOTAL';
  return defaultOp;
}

export interface ComputedModifier {
  value: number;
  operation: NormalizedOperation;
}

/**
 * Aplica modificadores numéricos exatamente na ordem de NumberProperty.compute do Silent Gear:
 * 1. Média ponderada (AVERAGE)
 * 2. Máximo (MAX)
 * 3. Multiplicativo base (MULTIPLY_BASE / mul1)
 * 4. Multiplicativo total (MULTIPLY_TOTAL / mul2)
 * 5. Aditivo (ADD)
 */
export function computeNumberProperty(
  baseValue: number,
  modifiers: ComputedModifier[]
): number {
  if (modifiers.length === 0) return baseValue;

  let f0 = baseValue;

  // 1. Average (ponderada, usada em partes principais)
  const avgMods = modifiers.filter((m) => m.operation === 'AVERAGE');
  if (avgMods.length > 0) {
    let primaryMod = -1;
    for (const mod of avgMods) {
      if (primaryMod < 0) {
        primaryMod = mod.value;
      }
    }
    const safePrimaryMod = primaryMod > 0 ? primaryMod : 1;

    let ret = 0;
    let totalWeight = 0;
    for (const mod of avgMods) {
      const weight = 1 + mod.value / (1 + Math.abs(safePrimaryMod));
      totalWeight += weight;
      ret += mod.value * weight;
    }
    f0 += totalWeight > 0 ? ret / totalWeight : ret;
  }

  // 2. Maximum
  for (const mod of modifiers) {
    if (mod.operation === 'MAX') {
      f0 = Math.max(f0, mod.value);
    }
  }

  // 3. Multiplicative base (MULTIPLY_BASE)
  let f1 = f0;
  for (const mod of modifiers) {
    if (mod.operation === 'MULTIPLY_BASE') {
      f1 += f0 * mod.value;
    }
  }

  // 4. Multiplicative total (MULTIPLY_TOTAL)
  for (const mod of modifiers) {
    if (mod.operation === 'MULTIPLY_TOTAL') {
      f1 *= 1.0 + mod.value;
    }
  }

  // 5. Additive
  for (const mod of modifiers) {
    if (mod.operation === 'ADD') {
      f1 += mod.value;
    }
  }

  return f1;
}

export function extractModifiers(
  raw: StatModifierEntry | undefined,
  defaultOp: NormalizedOperation = 'ADD'
): StatValueModifier[] {
  if (raw === undefined || raw === null) return [];
  if (typeof raw === 'number') {
    return [{ value: raw, operation: defaultOp }];
  }
  if (Array.isArray(raw)) {
    return raw.map((item) => ({
      value: item.value,
      operation: item.operation ?? defaultOp,
    }));
  }
  if (typeof raw === 'object' && 'value' in raw) {
    return [{
      value: raw.value,
      operation: raw.operation ?? defaultOp,
    }];
  }
  return [];
}

export function extractLegacyStatModifiers(
  mod: StatModifier | undefined
): StatValueModifier[] {
  if (!mod) return [];
  const list: StatValueModifier[] = [];
  if (mod.add !== undefined) list.push({ value: mod.add, operation: 'ADD' });
  if (mod.mul !== undefined) list.push({ value: mod.mul, operation: 'MULTIPLY_BASE' });
  if (mod.mul2 !== undefined) list.push({ value: mod.mul2, operation: 'MULTIPLY_TOTAL' });
  return list;
}

/**
 * Resolve a propriedade pela cadeia tipo → pai → genérico (GearPropertyMap.java).
 * `armor_by_piece` é lido só para catálogos salvos antes de `by_type`.
 */
export function resolveTypedStat(
  stats: MaterialStats | undefined,
  property: TypedStatProperty,
  gearTypeId?: string
): StatModifierEntry | undefined {
  if (!stats) return undefined;
  const legacyByPiece = property === 'armor' ? stats.armor_by_piece : undefined;
  const byType: Partial<Record<string, StatModifierEntry>> | undefined = stats.by_type?.[property] ?? legacyByPiece;
  if (byType && gearTypeId) {
    for (const ancestor of getGearTypeAncestors(gearTypeId)) {
      const entry = byType[ancestor];
      if (entry !== undefined) return entry;
    }
  }
  return stats[property];
}

export function getNumericStatValue(
  entry: StatModifierEntry | undefined,
  defaultValue: number = 0
): number {
  if (entry === undefined || entry === null) return defaultValue;
  if (typeof entry === 'number') return entry;
  if (Array.isArray(entry)) return entry[0]?.value ?? defaultValue;
  if (typeof entry === 'object' && 'value' in entry) return entry.value;
  return defaultValue;
}

export function applyGradeToModifiers(
  mods: StatValueModifier[],
  gradeMul: number,
  affectedByGrades: boolean = true,
  defaultOp: NormalizedOperation = 'ADD'
): ComputedModifier[] {
  return mods.map((mod) => {
    const op = normalizeOperation(mod.operation, defaultOp);
    const value = affectedByGrades && gradeMul !== 0
      ? applyGradeBonus(mod.value, gradeMul)
      : mod.value;
    return { value, operation: op };
  });
}

export function compressModifiersForProperty(
  modifiers: StatValueModifier[],
  defaultOp: NormalizedOperation = 'ADD'
): StatValueModifier[] {
  if (modifiers.length === 0) return [];
  const result: StatValueModifier[] = [];

  const operations: NormalizedOperation[] = [
    'AVERAGE',
    'MAX',
    'ADD',
    'MULTIPLY_BASE',
    'MULTIPLY_TOTAL',
  ];

  for (const op of operations) {
    const modsForOp = modifiers.filter(
      (m) => normalizeOperation(m.operation, defaultOp) === op
    );
    if (modsForOp.length === 1) {
      result.push({ value: modsForOp[0].value, operation: op });
    } else if (modsForOp.length > 1) {
      if (op === 'MAX') {
        const maxVal = Math.max(...modsForOp.map((m) => m.value));
        result.push({ value: maxVal, operation: 'MAX' });
      } else {
        let primaryMod = -1;
        for (const m of modsForOp) {
          if (primaryMod < 0) {
            primaryMod = m.value;
            break;
          }
        }
        const safePrimaryMod = primaryMod > 0 ? primaryMod : 1;

        let ret = 0;
        let totalWeight = 0;
        for (const m of modsForOp) {
          const weight = 1 + m.value / (1 + Math.abs(safePrimaryMod));
          totalWeight += weight;
          ret += m.value * weight;
        }
        const value = totalWeight > 0 ? ret / totalWeight : ret;
        result.push({ value, operation: op });
      }
    }
  }

  return result;
}

/**
 * Calcula o valor base de carga (charging_value) composto para múltiplos materiais.
 * Conforme ChargedMaterialModifier.java e CompoundMaterial.java, o valor de carga vem
 * das propriedades de PartTypes.MAIN e é comprimido via média ponderada (AVERAGE).
 */
export function calculateCompoundChargingValue(
  subMaterials: Material[],
  slot: PartSlot = 'main'
): number | undefined {
  const rawMods: StatValueModifier[] = [];
  for (const mat of subMaterials) {
    const entry = mat.stats[slot]?.charging_value ?? mat.stats.main?.charging_value;
    if (entry !== undefined && entry !== null) {
      rawMods.push(...extractModifiers(entry, 'AVERAGE'));
    }
  }
  if (rawMods.length === 0) return undefined;
  const compressed = compressModifiersForProperty(rawMods, 'AVERAGE');
  return compressed.length > 0 ? compressed[0].value : undefined;
}

export const CRUDE_PROPERTY_MULTIPLIER = 0.8;

/**
 * Compõe as propriedades de um slot feito de múltiplos sub-materiais (liga ou tecido misto),
 * aplicando média ponderada, sinergia de SynergyUtils e penalidade de liga crua antes do fluxo canônico.
 */
export function composeCompoundSlotModifiers(
  subMaterials: Material[],
  slot: PartSlot,
  isArmor: boolean,
  gearPieceId?: string,
  alloyType?: AlloyType
) {
  const isMain = slot === 'main';
  const defaultOp: NormalizedOperation = isMain ? 'AVERAGE' : 'ADD';
  // Traits
  const traits: MaterialTraitRef[] = [];
  for (const mat of subMaterials) {
    const matTraits = mat.traits[slot] || [];
    traits.push(...matTraits);
  }
  const synergy = calculateSynergy(subMaterials, slot, traits);
  const isCrude = alloyType === 'crude';
  const crudeMultiplier = isCrude ? CRUDE_PROPERTY_MULTIPLIER : 1.0;

  function processStat(
    extractor: (mat: Material) => StatModifierEntry | undefined,
    affectedBySynergy: boolean
  ): StatValueModifier[] {
    const rawMods: StatValueModifier[] = [];
    for (const mat of subMaterials) {
      const entry = extractor(mat);
      if (entry !== undefined && entry !== null) {
        rawMods.push(...extractModifiers(entry, defaultOp));
      }
    }
    if (rawMods.length === 0) return [];
    const compressed = compressModifiersForProperty(rawMods, defaultOp);
    if (!affectedBySynergy) {
      return compressed;
    }
    return compressed.map((m) => {
      let val = m.value;
      if (Math.abs(synergy - 1.0) >= 1e-6) {
        val = applySynergyBonus(val, synergy);
      }
      if (isCrude) {
        val = val * crudeMultiplier;
      }
      return {
        ...m,
        value: val,
      };
    });
  }

  // Armor
  const armorMods = processStat((mat) => resolveTypedStat(mat.stats[slot], 'armor', gearPieceId), true);

  // Toughness
  const toughnessMods = processStat((mat) => mat.stats[slot]?.armor_toughness, true);

  // Magic Armor
  const magicArmorMods = processStat((mat) => mat.stats[slot]?.magic_armor, true);

  // Knockback Resistance
  const knockbackMods = processStat((mat) => mat.stats[slot]?.knockback_resistance, true);

  // Durability (no caso de armadura no main usa fallback; em secundários usa estritamente armor_durability)
  const durabilityMods = processStat((mat) => {
    const stats = mat.stats[slot];
    if (!stats) return undefined;
    if (isArmor) {
      const armorDurability = resolveTypedStat(stats, 'armor_durability', gearPieceId);
      return isMain ? (armorDurability ?? stats.durability) : armorDurability;
    }
    return stats.durability;
  }, true);

  // Melee Damage
  const meleeDamageMods = processStat((mat) => mat.stats[slot]?.melee_damage, true);

  // Attack Speed (não afetado por sinergia)
  const attackSpeedMods = processStat((mat) => resolveTypedStat(mat.stats[slot], 'attack_speed', gearPieceId), false);

  // Harvest Speed
  const harvestSpeedMods = processStat((mat) => mat.stats[slot]?.harvest_speed, true);

  // Rarity (não afetado por sinergia)
  const rarityMods = processStat((mat) => mat.stats[slot]?.rarity, false);

  // Harvest Tier (o primeiro material com tier define)
  let harvestTier: string | undefined;
  for (const mat of subMaterials) {
    if (mat.stats[slot]?.harvest_tier) {
      harvestTier = mat.stats[slot]?.harvest_tier;
      break;
    }
  }
  if (!harvestTier && isMain) {
    harvestTier = subMaterials[0]?.harvest_tier || 'minecraft:wood';
  }

  // Charging Value (não afetado por sinergia na extração, compõe por média ponderada)
  const compoundChargingVal = calculateCompoundChargingValue(subMaterials, slot);
  const chargingValueMods: StatValueModifier[] = compoundChargingVal !== undefined
    ? [{ value: compoundChargingVal, operation: 'AVERAGE' }]
    : [];

  return {
    synergy,
    armorMods,
    toughnessMods,
    magicArmorMods,
    knockbackMods,
    durabilityMods,
    meleeDamageMods,
    attackSpeedMods,
    harvestSpeedMods,
    rarityMods,
    chargingValueMods,
    harvestTier,
    traits,
  };
}
/**
 * Aplica modificador do Starlight Charger (starcharged) conforme StarchargedMaterialModifier.java:
 * - Apenas operações AVERAGE, MAX e ADD são suportadas (isSupportedModifierOp).
 * - Multiplicativos (MULTIPLY_BASE, MULTIPLY_TOTAL) permanecem inalterados.
 * - c = starchargeLevel * chargingValue (ChargedProperties.java).
 */
export function applyStarcharge(
  value: number,
  statKey: string,
  starchargeLevel: number = 0,
  chargingValue: number = 0,
  operation: NormalizedOperation = 'ADD'
): number {
  if (starchargeLevel <= 0) return value;
  if (operation !== 'AVERAGE' && operation !== 'MAX' && operation !== 'ADD') {
    return value;
  }

  const c = starchargeLevel * chargingValue;

  switch (statKey) {
    case 'durability':
      return value * Math.pow(1.25, c);
    case 'armor_durability':
    case 'enchantment_value':
      return value * Math.pow(1.1, c);
    case 'harvest_speed':
      return value + 1.5 * starchargeLevel * c;
    case 'melee_damage':
    case 'attack_damage':
    case 'magic_damage':
      return value + c;
    case 'ranged_damage':
      return value + c / 2.0;
    case 'armor':
    case 'armor_toughness':
    case 'magic_armor':
      return value + c * 2.0;
    default:
      return value;
  }
}

export function applyEnhancementsToModifiers(
  mods: StatValueModifier[],
  statKey: string,
  gradeMul: number,
  affectedByGrades: boolean = true,
  starchargeLevel: number = 0,
  chargingValue: number = 0,
  defaultOp: NormalizedOperation = 'ADD'
): ComputedModifier[] {
  return mods.map((mod) => {
    const op = normalizeOperation(mod.operation, defaultOp);
    let value = affectedByGrades && gradeMul !== 0
      ? applyGradeBonus(mod.value, gradeMul)
      : mod.value;
    value = applyStarcharge(value, statKey, starchargeLevel, chargingValue, op);
    return { value, operation: op };
  });
}

export interface ResolvedSlotInstance {
  materialId: string;
  grade: Grade;
  starcharge: StarchargeLevel;
  materials?: SubMaterialSelection[];
  alloyType?: AlloyType;
}

/**
 * Resolve as instâncias que compõem uma parte (Issue #33).
 * Se instances tiver sido configurado com mais de 1 item, herda os campos ausentes da parte.
 * Caso contrário, gera uma lista de N instâncias repetindo a configuração de topo da parte.
 */
export function resolveSlotInstances(
  selection: GearPartSelection | undefined,
  gearTypeId: string,
  slot: PartSlot
): ResolvedSlotInstance[] {
  if (!selection) return [];
  const count = getPartInstanceCount(gearTypeId, slot);
  const syncedInstances = syncPartInstancesWithCount(selection, count);
  const defaultGrade = selection.grade || 'NONE';
  const defaultStarcharge = selection.starcharge || 0;
  const defaultMaterialId = selection.materialId || selection.materials?.[0]?.materialId || '';

  return syncedInstances.map((inst) => ({
    materialId: inst.materialId || defaultMaterialId,
    grade: inst.grade ?? defaultGrade,
    starcharge: inst.starcharge ?? defaultStarcharge,
    materials: inst.materials ?? selection.materials,
    alloyType: inst.alloyType ?? selection.alloyType,
  }));
}

/**
 * Determina se as instâncias da parte têm graus, starcharge ou composições diferentes entre si.
 */
export function areInstancesHeterogeneous(instances: ResolvedSlotInstance[]): boolean {
  if (instances.length <= 1) return false;
  const first = instances[0];
  const firstMatsKey = first.materials ? JSON.stringify(first.materials) : '';
  for (let i = 1; i < instances.length; i++) {
    const curr = instances[i];
    const currMatsKey = curr.materials ? JSON.stringify(curr.materials) : '';
    if (
      curr.grade !== first.grade ||
      curr.starcharge !== first.starcharge ||
      curr.materialId !== first.materialId ||
      curr.alloyType !== first.alloyType ||
      currMatsKey !== firstMatsKey
    ) {
      return true;
    }
  }
  return false;
}

export function toComputedModifiers(
  mods: StatValueModifier[],
  defOp: NormalizedOperation = 'AVERAGE'
): ComputedModifier[] {
  return mods.map((m) => ({ value: m.value, operation: normalizeOperation(m.operation, defOp) }));
}

export function extractSlotRawModifiers(
  inst: ResolvedSlotInstance,
  slot: PartSlot,
  isArmor: boolean,
  gearTypeId: string,
  catalog: VersionCatalog
) {
  const instSubMaterials: Material[] = (inst.materials && inst.materials.length > 0)
    ? inst.materials.map((m) => catalog.materials[m.materialId]).filter(Boolean)
    : (catalog.materials[inst.materialId] ? [catalog.materials[inst.materialId]] : []);
  const isInstCompound = instSubMaterials.length > 1;
  const instMat = instSubMaterials[0] || null;

  let composedInst: ReturnType<typeof composeCompoundSlotModifiers> | null = null;
  if (isInstCompound) {
    composedInst = composeCompoundSlotModifiers(
      instSubMaterials,
      slot,
      isArmor,
      gearTypeId,
      inst.alloyType
    );
  }

  const instGradeMul = inst.grade ? (GRADE_MULTIPLIERS[inst.grade] || 0) : 0;
  const instStarchargeLevel = inst.starcharge || 0;
  const instChargingValue = (composedInst && composedInst.chargingValueMods.length > 0)
    ? composedInst.chargingValueMods[0].value
    : getNumericStatValue(instMat?.stats[slot]?.charging_value ?? instMat?.stats.main?.charging_value, 0);

  const armor: StatValueModifier[] = [];
  const toughness: StatValueModifier[] = [];
  const magicArmor: StatValueModifier[] = [];
  const knockback: StatValueModifier[] = [];
  const armorDur: StatValueModifier[] = [];
  const toolDur: StatValueModifier[] = [];
  const melee: StatValueModifier[] = [];
  const speed: StatValueModifier[] = [];
  const harvest: StatValueModifier[] = [];
  const rarity: StatValueModifier[] = [];
  let flatDurAdd = 0;
  let harvestTier = composedInst?.harvestTier || instMat?.stats[slot]?.harvest_tier;

  if (composedInst) {
    if (composedInst.armorMods.length > 0) {
      armor.push(...applyEnhancementsToModifiers(composedInst.armorMods, 'armor', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
    }
    if (composedInst.toughnessMods.length > 0) {
      toughness.push(...applyEnhancementsToModifiers(composedInst.toughnessMods, 'armor_toughness', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
    }
    if (composedInst.magicArmorMods.length > 0) {
      magicArmor.push(...applyEnhancementsToModifiers(composedInst.magicArmorMods, 'magic_armor', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
    }
    if (composedInst.knockbackMods.length > 0) {
      knockback.push(...applyEnhancementsToModifiers(composedInst.knockbackMods, 'knockback_resistance', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
    }
    if (composedInst.durabilityMods.length > 0) {
      if (isArmor) {
        armorDur.push(...applyEnhancementsToModifiers(composedInst.durabilityMods, 'armor_durability', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
      } else {
        toolDur.push(...applyEnhancementsToModifiers(composedInst.durabilityMods, 'durability', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
      }
    }
    if (composedInst.meleeDamageMods.length > 0) {
      melee.push(...applyEnhancementsToModifiers(composedInst.meleeDamageMods, 'melee_damage', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
    }
    if (composedInst.attackSpeedMods.length > 0) {
      speed.push(...applyEnhancementsToModifiers(composedInst.attackSpeedMods, 'attack_speed', instGradeMul, false, instStarchargeLevel, instChargingValue, 'ADD'));
    }
    if (composedInst.harvestSpeedMods.length > 0) {
      harvest.push(...applyEnhancementsToModifiers(composedInst.harvestSpeedMods, 'harvest_speed', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
    }
    if (composedInst.rarityMods.length > 0) {
      rarity.push(...applyEnhancementsToModifiers(composedInst.rarityMods, 'rarity', instGradeMul, false, instStarchargeLevel, instChargingValue, 'ADD'));
    }
  } else if (instMat) {
    const slotStats = instMat.stats[slot];
    const slotMods = instMat.statModifiers?.[slot];

    if (slotStats) {
      const slotArmorRaw = resolveTypedStat(slotStats, 'armor', gearTypeId);
      if (slotArmorRaw !== undefined) {
        armor.push(...applyEnhancementsToModifiers(extractModifiers(slotArmorRaw, 'ADD'), 'armor', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
      }
      if (slotStats.armor_toughness !== undefined) {
        toughness.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.armor_toughness, 'ADD'), 'armor_toughness', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
      }
      if (slotStats.magic_armor !== undefined) {
        magicArmor.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.magic_armor, 'ADD'), 'magic_armor', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
      }
      if (slotStats.knockback_resistance !== undefined) {
        knockback.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.knockback_resistance, 'ADD'), 'knockback_resistance', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
      }
      if (isArmor) {
        const slotArmorDurability = resolveTypedStat(slotStats, 'armor_durability', gearTypeId);
        if (slotArmorDurability !== undefined) {
          armorDur.push(...applyEnhancementsToModifiers(extractModifiers(slotArmorDurability, 'ADD'), 'armor_durability', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
        } else if (slotStats.durability !== undefined) {
          const durMods = extractModifiers(slotStats.durability, 'ADD');
          for (const dm of durMods) {
            const op = normalizeOperation(dm.operation, 'ADD');
            if (op === 'MULTIPLY_TOTAL' || op === 'MULTIPLY_BASE') {
              armorDur.push(...applyEnhancementsToModifiers([dm], 'durability', instGradeMul, true, instStarchargeLevel, instChargingValue, op));
            } else {
              let val = applyGradeBonus(dm.value, instGradeMul);
              val = applyStarcharge(val, 'durability', instStarchargeLevel, instChargingValue, op);
              flatDurAdd += val;
            }
          }
        }
      } else {
        if (slotStats.durability !== undefined) {
          toolDur.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.durability, 'ADD'), 'durability', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
        }
      }
      if (slotStats.melee_damage !== undefined) {
        melee.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.melee_damage, 'ADD'), 'melee_damage', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
      }
      const slotAttackSpeed = resolveTypedStat(slotStats, 'attack_speed', gearTypeId);
      if (slotAttackSpeed !== undefined) {
        speed.push(...applyEnhancementsToModifiers(extractModifiers(slotAttackSpeed, 'ADD'), 'attack_speed', instGradeMul, false, instStarchargeLevel, instChargingValue, 'ADD'));
      }
      if (slotStats.harvest_speed !== undefined) {
        harvest.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.harvest_speed, 'ADD'), 'harvest_speed', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
      }
      if (slotStats.rarity !== undefined) {
        rarity.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.rarity, 'ADD'), 'rarity', instGradeMul, false, instStarchargeLevel, instChargingValue, 'ADD'));
      }
    }

    if (slotMods) {
      if (slotMods.durability) {
        const legacyMods = extractLegacyStatModifiers(slotMods.durability);
        if (isArmor) {
          for (const lm of legacyMods) {
            const op = normalizeOperation(lm.operation, 'ADD');
            if (op === 'MULTIPLY_TOTAL' || op === 'MULTIPLY_BASE') {
              armorDur.push(...applyEnhancementsToModifiers([lm], 'durability', instGradeMul, true, instStarchargeLevel, instChargingValue, op));
            } else {
              let val = applyGradeBonus(lm.value, instGradeMul);
              val = applyStarcharge(val, 'durability', instStarchargeLevel, instChargingValue, op);
              flatDurAdd += val;
            }
          }
        } else {
          toolDur.push(...applyEnhancementsToModifiers(legacyMods, 'durability', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
        }
      }
      if (slotMods.harvest_speed) {
        const legacyMods = extractLegacyStatModifiers(slotMods.harvest_speed);
        harvest.push(...applyEnhancementsToModifiers(legacyMods, 'harvest_speed', instGradeMul, true, instStarchargeLevel, instChargingValue, 'ADD'));
      }
      if (slotMods.attack_speed) {
        const legacyMods = extractLegacyStatModifiers(slotMods.attack_speed);
        speed.push(...applyEnhancementsToModifiers(legacyMods, 'attack_speed', instGradeMul, false, instStarchargeLevel, instChargingValue, 'ADD'));
      }
    }
  }

  return {
    armor,
    toughness,
    magicArmor,
    knockback,
    armorDur,
    toolDur,
    melee,
    speed,
    harvest,
    rarity,
    flatDurAdd,
    harvestTier,
  };
}

export function calculateGearStats(
  build: GearBuild,
  catalog: VersionCatalog
): CalculatedGearStats {
  const gearType = catalog.gearTypes[build.gearTypeId];
  if (!gearType) {
    throw new Error(`GearType '${build.gearTypeId}' not found in catalog.`);
  }

  const isArmor = gearType.category === 'armor';
  const mainSelection = build.parts.main;

  const resolvedMainInstances = resolveSlotInstances(mainSelection, gearType.id, 'main');
  const isMainHeterogeneous = areInstancesHeterogeneous(resolvedMainInstances);

  let heterogeneousInitialDamage: number | null = null;
  let heterogeneousInitialAttackSpeed: number | null = null;
  let heterogeneousInitialHarvestSpeed: number | null = null;

  const armorMods: ComputedModifier[] = [];
  const toughnessMods: ComputedModifier[] = [];
  const magicArmorMods: ComputedModifier[] = [];
  const knockbackMods: ComputedModifier[] = [];
  const armorDurMods: ComputedModifier[] = [];
  let flatDurabilityAdditions = 0;
  const toolDurMods: ComputedModifier[] = [];

  const effectiveMainGrade = resolvedMainInstances[0]?.grade ?? mainSelection?.grade ?? 'NONE';
  const effectiveMainStarcharge = resolvedMainInstances[0]?.starcharge ?? mainSelection?.starcharge ?? 0;
  const effectiveMainMaterials = (resolvedMainInstances[0]?.materials && resolvedMainInstances[0].materials.length > 0)
    ? resolvedMainInstances[0].materials
    : mainSelection?.materials;
  const effectiveMainAlloyType = resolvedMainInstances[0]?.alloyType ?? mainSelection?.alloyType;

  const mainSubMaterials: Material[] = (effectiveMainMaterials && effectiveMainMaterials.length > 0)
    ? effectiveMainMaterials.map((m) => catalog.materials[m.materialId]).filter(Boolean)
    : (mainSelection && catalog.materials[resolvedMainInstances[0]?.materialId || mainSelection.materialId] ? [catalog.materials[resolvedMainInstances[0]?.materialId || mainSelection.materialId]] : []);

  const isMainCompound = mainSubMaterials.length > 1;
  const mainMaterial = mainSubMaterials[0] || null;

  let mainSynergy = 1.0;
  let composedMain: ReturnType<typeof composeCompoundSlotModifiers> | null = null;
  if (isMainCompound) {
    composedMain = composeCompoundSlotModifiers(
      mainSubMaterials,
      'main',
      isArmor,
      gearType.id,
      effectiveMainAlloyType
    );
    mainSynergy = composedMain.synergy;
  }

  const mainGradeMul = GRADE_MULTIPLIERS[effectiveMainGrade] || 0;
  const mainStarchargeLevel = effectiveMainStarcharge;
  const mainChargingValue = (composedMain && composedMain.chargingValueMods.length > 0)
    ? composedMain.chargingValueMods[0].value
    : getNumericStatValue(mainMaterial?.stats.main?.charging_value, 0);

  if (isMainHeterogeneous) {
    // Cálculo multinstância conforme CoreGearPart.java:125-144
    const instRawArmorMods: StatValueModifier[] = [];
    const instRawToughnessMods: StatValueModifier[] = [];
    const instRawMagicArmorMods: StatValueModifier[] = [];
    const instRawKnockbackMods: StatValueModifier[] = [];
    const instRawArmorDurMods: StatValueModifier[] = [];
    const instRawToolDurMods: StatValueModifier[] = [];
    const instRawMeleeMods: StatValueModifier[] = [];
    const instRawAttackSpeedMods: StatValueModifier[] = [];
    const instRawHarvestSpeedMods: StatValueModifier[] = [];

    for (const inst of resolvedMainInstances) {
      const instSubMaterials: Material[] = (inst.materials && inst.materials.length > 0)
        ? inst.materials.map((m) => catalog.materials[m.materialId]).filter(Boolean)
        : (catalog.materials[inst.materialId] ? [catalog.materials[inst.materialId]] : []);
      const isInstCompound = instSubMaterials.length > 1;
      const instMat = instSubMaterials[0] || null;

      let composedInst: ReturnType<typeof composeCompoundSlotModifiers> | null = null;
      if (isInstCompound) {
        composedInst = composeCompoundSlotModifiers(
          instSubMaterials,
          'main',
          isArmor,
          gearType.id,
          inst.alloyType
        );
      }

      const instGradeMul = inst.grade ? (GRADE_MULTIPLIERS[inst.grade] || 0) : 0;
      const instStarchargeLevel = inst.starcharge || 0;
      const instChargingValue = (composedInst && composedInst.chargingValueMods.length > 0)
        ? composedInst.chargingValueMods[0].value
        : getNumericStatValue(instMat?.stats.main?.charging_value, 0);

      // Armor
      if (composedInst) {
        instRawArmorMods.push(...applyEnhancementsToModifiers(composedInst.armorMods, 'armor', instGradeMul, true, instStarchargeLevel, instChargingValue, 'AVERAGE'));
      } else if (instMat?.stats.main) {
        const mainArmorRaw = resolveTypedStat(instMat.stats.main, 'armor', gearType.id);
        const rawMods = extractModifiers(mainArmorRaw, 'AVERAGE');
        instRawArmorMods.push(...applyEnhancementsToModifiers(rawMods, 'armor', instGradeMul, true, instStarchargeLevel, instChargingValue, 'AVERAGE'));
      }

      // Toughness
      if (composedInst) {
        instRawToughnessMods.push(...applyEnhancementsToModifiers(composedInst.toughnessMods, 'armor_toughness', instGradeMul, true, instStarchargeLevel, instChargingValue, 'AVERAGE'));
      } else if (instMat?.stats.main?.armor_toughness !== undefined) {
        const rawMods = extractModifiers(instMat.stats.main.armor_toughness, 'AVERAGE');
        instRawToughnessMods.push(...applyEnhancementsToModifiers(rawMods, 'armor_toughness', instGradeMul, true, instStarchargeLevel, instChargingValue, 'AVERAGE'));
      }

      // Magic armor
      if (composedInst) {
        instRawMagicArmorMods.push(...applyEnhancementsToModifiers(composedInst.magicArmorMods, 'magic_armor', instGradeMul, true, instStarchargeLevel, instChargingValue, 'AVERAGE'));
      } else if (instMat?.stats.main?.magic_armor !== undefined) {
        const rawMods = extractModifiers(instMat.stats.main.magic_armor, 'AVERAGE');
        instRawMagicArmorMods.push(...applyEnhancementsToModifiers(rawMods, 'magic_armor', instGradeMul, true, instStarchargeLevel, instChargingValue, 'AVERAGE'));
      }

      // Knockback
      if (composedInst) {
        instRawKnockbackMods.push(...applyEnhancementsToModifiers(composedInst.knockbackMods, 'knockback_resistance', instGradeMul, true, instStarchargeLevel, instChargingValue, 'AVERAGE'));
      } else if (instMat?.stats.main?.knockback_resistance !== undefined) {
        const rawMods = extractModifiers(instMat.stats.main.knockback_resistance, 'AVERAGE');
        instRawKnockbackMods.push(...applyEnhancementsToModifiers(rawMods, 'knockback_resistance', instGradeMul, true, instStarchargeLevel, instChargingValue, 'AVERAGE'));
      }

      // Durability
      if (composedInst) {
        if (isArmor) {
          instRawArmorDurMods.push(...applyEnhancementsToModifiers(composedInst.durabilityMods, 'armor_durability', instGradeMul, true, instStarchargeLevel, instChargingValue, 'AVERAGE'));
        } else {
          const scaledMainMods = composedInst.durabilityMods.map((m) => ({
            ...m,
            value: m.value * gearType.durabilityMultiplier,
          }));
          instRawToolDurMods.push(...applyEnhancementsToModifiers(scaledMainMods, 'durability', instGradeMul, true, instStarchargeLevel, instChargingValue, 'AVERAGE'));
        }
      } else if (isArmor) {
        const mainArmorDurRaw = resolveTypedStat(instMat?.stats.main, 'armor_durability', gearType.id) ?? instMat?.stats.main?.durability ?? 100;
        const rawMods = extractModifiers(mainArmorDurRaw, 'AVERAGE');
        instRawArmorDurMods.push(...applyEnhancementsToModifiers(rawMods, 'armor_durability', instGradeMul, true, instStarchargeLevel, instChargingValue, 'AVERAGE'));
      } else {
        const rawMainMods = extractModifiers(instMat?.stats.main?.durability ?? 100, 'AVERAGE');
        const scaledMainMods = rawMainMods.map((m) => ({ ...m, value: m.value * gearType.durabilityMultiplier }));
        instRawToolDurMods.push(...applyEnhancementsToModifiers(scaledMainMods, 'durability', instGradeMul, true, instStarchargeLevel, instChargingValue, 'AVERAGE'));
      }

      // Melee Damage
      const rawMelee = composedInst
        ? composedInst.meleeDamageMods
        : extractModifiers(instMat?.stats.main?.melee_damage, 'AVERAGE');
      if (rawMelee.length > 0) {
        instRawMeleeMods.push(...applyEnhancementsToModifiers(rawMelee, 'melee_damage', instGradeMul, true, instStarchargeLevel, instChargingValue, 'AVERAGE'));
      }

      // Attack speed
      const rawSpeed = composedInst
        ? composedInst.attackSpeedMods
        : extractModifiers(resolveTypedStat(instMat?.stats.main, 'attack_speed', gearType.id), 'AVERAGE');
      if (rawSpeed.length > 0) {
        instRawAttackSpeedMods.push(...applyEnhancementsToModifiers(rawSpeed, 'attack_speed', instGradeMul, false, instStarchargeLevel, instChargingValue, 'AVERAGE'));
      }

      // Harvest speed
      const rawHarvest = composedInst
        ? composedInst.harvestSpeedMods
        : extractModifiers(instMat?.stats.main?.harvest_speed ?? 1.0, 'AVERAGE');
      if (rawHarvest.length > 0) {
        instRawHarvestSpeedMods.push(...applyEnhancementsToModifiers(rawHarvest, 'harvest_speed', instGradeMul, true, instStarchargeLevel, instChargingValue, 'AVERAGE'));
      }
    }

    armorMods.push(...toComputedModifiers(compressModifiersForProperty(instRawArmorMods, 'AVERAGE'), 'AVERAGE'));
    toughnessMods.push(...toComputedModifiers(compressModifiersForProperty(instRawToughnessMods, 'AVERAGE'), 'AVERAGE'));
    magicArmorMods.push(...toComputedModifiers(compressModifiersForProperty(instRawMagicArmorMods, 'AVERAGE'), 'AVERAGE'));
    knockbackMods.push(...toComputedModifiers(compressModifiersForProperty(instRawKnockbackMods, 'AVERAGE'), 'AVERAGE'));
    if (isArmor) {
      armorDurMods.push(...toComputedModifiers(compressModifiersForProperty(instRawArmorDurMods, 'AVERAGE'), 'AVERAGE'));
    } else {
      toolDurMods.push(...toComputedModifiers(compressModifiersForProperty(instRawToolDurMods, 'AVERAGE'), 'AVERAGE'));
    }

    const compMelee = compressModifiersForProperty(instRawMeleeMods, 'AVERAGE');
    heterogeneousInitialDamage = compMelee.length > 0 ? compMelee[0].value : 0;

    const compSpeed = compressModifiersForProperty(instRawAttackSpeedMods, 'AVERAGE');
    heterogeneousInitialAttackSpeed = gearType.baseAttackSpeed + (compSpeed.length > 0 ? compSpeed[0].value : 0);

    const compHarvest = compressModifiersForProperty(instRawHarvestSpeedMods, 'AVERAGE');
    heterogeneousInitialHarvestSpeed = compHarvest.length > 0 ? compHarvest[0].value : 1.0;
  } else {
    // 1. ARMOR
    if (composedMain) {
      armorMods.push(...applyEnhancementsToModifiers(composedMain.armorMods, 'armor', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
    } else if (mainMaterial?.stats.main) {
      const mainArmorRaw = resolveTypedStat(mainMaterial.stats.main, 'armor', gearType.id);
      const rawMods = extractModifiers(mainArmorRaw, 'AVERAGE');
      armorMods.push(...applyEnhancementsToModifiers(rawMods, 'armor', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
    }

    // 2. ARMOR TOUGHNESS
    if (composedMain) {
      toughnessMods.push(...applyEnhancementsToModifiers(composedMain.toughnessMods, 'armor_toughness', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
    } else if (mainMaterial?.stats.main?.armor_toughness !== undefined) {
      const rawMods = extractModifiers(mainMaterial.stats.main.armor_toughness, 'AVERAGE');
      toughnessMods.push(...applyEnhancementsToModifiers(rawMods, 'armor_toughness', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
    }

    // 3. MAGIC ARMOR
    if (composedMain) {
      magicArmorMods.push(...applyEnhancementsToModifiers(composedMain.magicArmorMods, 'magic_armor', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
    } else if (mainMaterial?.stats.main?.magic_armor !== undefined) {
      const rawMods = extractModifiers(mainMaterial.stats.main.magic_armor, 'AVERAGE');
      magicArmorMods.push(...applyEnhancementsToModifiers(rawMods, 'magic_armor', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
    }

    // 4. KNOCKBACK RESISTANCE
    if (composedMain) {
      knockbackMods.push(...applyEnhancementsToModifiers(composedMain.knockbackMods, 'knockback_resistance', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
    } else if (mainMaterial?.stats.main?.knockback_resistance !== undefined) {
      const rawMods = extractModifiers(mainMaterial.stats.main.knockback_resistance, 'AVERAGE');
      knockbackMods.push(...applyEnhancementsToModifiers(rawMods, 'knockback_resistance', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
    }

    // 5. DURABILITY
    if (composedMain) {
      if (isArmor) {
        armorDurMods.push(...applyEnhancementsToModifiers(composedMain.durabilityMods, 'armor_durability', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
      } else {
        const scaledMainMods = composedMain.durabilityMods.map((m) => ({
          ...m,
          value: m.value * gearType.durabilityMultiplier,
        }));
        toolDurMods.push(...applyEnhancementsToModifiers(scaledMainMods, 'durability', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
      }
    } else if (isArmor) {
      const mainArmorDurRaw = resolveTypedStat(mainMaterial?.stats.main, 'armor_durability', gearType.id) ?? mainMaterial?.stats.main?.durability ?? 100;
      const rawMods = extractModifiers(mainArmorDurRaw, 'AVERAGE');
      armorDurMods.push(...applyEnhancementsToModifiers(rawMods, 'armor_durability', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
    } else {
      const rawMainMods = extractModifiers(mainMaterial?.stats.main?.durability ?? 100, 'AVERAGE');
      const scaledMainMods = rawMainMods.map((m) => ({ ...m, value: m.value * gearType.durabilityMultiplier }));
      toolDurMods.push(...applyEnhancementsToModifiers(scaledMainMods, 'durability', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
    }
  }

  // 6. DAMAGE, ATTACK SPEED, HARVEST SPEED, RARITY
  const secondaryDamageMods: ComputedModifier[] = [];
  const secondaryAttackSpeedMods: ComputedModifier[] = [];
  const secondaryHarvestSpeedMods: ComputedModifier[] = [];
  const secondaryRarityMods: ComputedModifier[] = [];

  let harvestTier = (composedMain?.harvestTier) || mainMaterial?.stats.main?.harvest_tier || mainMaterial?.harvest_tier || 'minecraft:wood';

  // Processar slots secundários
  for (const slot of Object.keys(build.parts) as PartSlot[]) {
    if (slot === 'main') continue;
    const sel = build.parts[slot];
    if (!sel) continue;

    const resolvedSlotInstances = resolveSlotInstances(sel, gearType.id, slot);
    const isSlotHeterogeneous = areInstancesHeterogeneous(resolvedSlotInstances);

    if (isSlotHeterogeneous) {
      const allArmor: StatValueModifier[] = [];
      const allToughness: StatValueModifier[] = [];
      const allMagicArmor: StatValueModifier[] = [];
      const allKnockback: StatValueModifier[] = [];
      const allArmorDur: StatValueModifier[] = [];
      const allToolDur: StatValueModifier[] = [];
      const allMelee: StatValueModifier[] = [];
      const allSpeed: StatValueModifier[] = [];
      const allHarvest: StatValueModifier[] = [];
      const allRarity: StatValueModifier[] = [];
      let totalFlatDurAdd = 0;

      for (const inst of resolvedSlotInstances) {
        const mods = extractSlotRawModifiers(inst, slot, isArmor, gearType.id, catalog);
        allArmor.push(...mods.armor);
        allToughness.push(...mods.toughness);
        allMagicArmor.push(...mods.magicArmor);
        allKnockback.push(...mods.knockback);
        allArmorDur.push(...mods.armorDur);
        allToolDur.push(...mods.toolDur);
        allMelee.push(...mods.melee);
        allSpeed.push(...mods.speed);
        allHarvest.push(...mods.harvest);
        allRarity.push(...mods.rarity);
        totalFlatDurAdd += mods.flatDurAdd;
        if (mods.harvestTier) harvestTier = mods.harvestTier;
      }

      if (allArmor.length > 0) {
        armorMods.push(...toComputedModifiers(compressModifiersForProperty(allArmor, 'ADD'), 'ADD'));
      }
      if (allToughness.length > 0) {
        toughnessMods.push(...toComputedModifiers(compressModifiersForProperty(allToughness, 'ADD'), 'ADD'));
      }
      if (allMagicArmor.length > 0) {
        magicArmorMods.push(...toComputedModifiers(compressModifiersForProperty(allMagicArmor, 'ADD'), 'ADD'));
      }
      if (allKnockback.length > 0) {
        knockbackMods.push(...toComputedModifiers(compressModifiersForProperty(allKnockback, 'ADD'), 'ADD'));
      }
      if (isArmor) {
        if (allArmorDur.length > 0) {
          armorDurMods.push(...toComputedModifiers(compressModifiersForProperty(allArmorDur, 'ADD'), 'ADD'));
        }
        flatDurabilityAdditions += totalFlatDurAdd / resolvedSlotInstances.length;
      } else {
        if (allToolDur.length > 0) {
          toolDurMods.push(...toComputedModifiers(compressModifiersForProperty(allToolDur, 'ADD'), 'ADD'));
        }
      }
      if (allMelee.length > 0) {
        secondaryDamageMods.push(...toComputedModifiers(compressModifiersForProperty(allMelee, 'ADD'), 'ADD'));
      }
      if (allSpeed.length > 0) {
        secondaryAttackSpeedMods.push(...toComputedModifiers(compressModifiersForProperty(allSpeed, 'ADD'), 'ADD'));
      }
      if (allHarvest.length > 0) {
        secondaryHarvestSpeedMods.push(...toComputedModifiers(compressModifiersForProperty(allHarvest, 'ADD'), 'ADD'));
      }
      if (allRarity.length > 0) {
        secondaryRarityMods.push(...toComputedModifiers(compressModifiersForProperty(allRarity, 'ADD'), 'ADD'));
      }
    } else {
      const singleInst = resolvedSlotInstances[0];
      if (!singleInst) continue;
      const mods = extractSlotRawModifiers(singleInst, slot, isArmor, gearType.id, catalog);
      if (mods.armor.length > 0) armorMods.push(...toComputedModifiers(mods.armor, 'ADD'));
      if (mods.toughness.length > 0) toughnessMods.push(...toComputedModifiers(mods.toughness, 'ADD'));
      if (mods.magicArmor.length > 0) magicArmorMods.push(...toComputedModifiers(mods.magicArmor, 'ADD'));
      if (mods.knockback.length > 0) knockbackMods.push(...toComputedModifiers(mods.knockback, 'ADD'));
      if (isArmor) {
        if (mods.armorDur.length > 0) armorDurMods.push(...toComputedModifiers(mods.armorDur, 'ADD'));
        flatDurabilityAdditions += mods.flatDurAdd;
      } else {
        if (mods.toolDur.length > 0) toolDurMods.push(...toComputedModifiers(mods.toolDur, 'ADD'));
      }
      if (mods.melee.length > 0) secondaryDamageMods.push(...toComputedModifiers(mods.melee, 'ADD'));
      if (mods.speed.length > 0) secondaryAttackSpeedMods.push(...toComputedModifiers(mods.speed, 'ADD'));
      if (mods.harvest.length > 0) secondaryHarvestSpeedMods.push(...toComputedModifiers(mods.harvest, 'ADD'));
      if (mods.rarity.length > 0) secondaryRarityMods.push(...toComputedModifiers(mods.rarity, 'ADD'));
      if (mods.harvestTier) harvestTier = mods.harvestTier;
    }
  }

  // Calcular valores finais usando computeNumberProperty
  const baseArmor = computeNumberProperty(0, armorMods);
  const baseArmorToughness = computeNumberProperty(0, toughnessMods);
  const baseMagicArmor = computeNumberProperty(0, magicArmorMods);
  const baseKnockback = computeNumberProperty(0, knockbackMods);

  let baseDurability: number;
  if (isArmor) {
    const finalArmorDurability = computeNumberProperty(0, armorDurMods);
    // Silent Gear GearArmorItem.java:107-110: (int) multiplicador * (int) armor_durability (Issue #37)
    // Trunca a propriedade armor_durability antes de multiplicar pelo multiplicador inteiro da peça
    baseDurability = Math.trunc(finalArmorDurability) * Math.trunc(gearType.durabilityMultiplier) + flatDurabilityAdditions;
  } else {
    // Para ferramentas e armas, GearPropertiesData.getNumberInt mantém Math.round
    baseDurability = computeNumberProperty(0, toolDurMods);
  }

  const mainMeleeDamage = composedMain
    ? computeNumberProperty(0, applyEnhancementsToModifiers(composedMain.meleeDamageMods, 'melee_damage', 0, false, 0, 0, 'AVERAGE'))
    : getNumericStatValue(mainMaterial?.stats.main?.melee_damage, 0);
  let initialDamage = heterogeneousInitialDamage !== null
    ? heterogeneousInitialDamage
    : applyGradeBonus(mainMeleeDamage, mainGradeMul);
  if (heterogeneousInitialDamage === null && mainStarchargeLevel > 0) {
    initialDamage = applyStarcharge(initialDamage, 'melee_damage', mainStarchargeLevel, mainChargingValue, 'ADD');
  }
  const damageMods: ComputedModifier[] = [...secondaryDamageMods];
  if (gearType.baseDamage) {
    damageMods.push({ value: gearType.baseDamage, operation: 'ADD' });
  }
  const baseDamage = computeNumberProperty(initialDamage, damageMods);

  const mainAttackSpeed = composedMain
    ? computeNumberProperty(0, applyEnhancementsToModifiers(composedMain.attackSpeedMods, 'attack_speed', 0, false, 0, 0, 'AVERAGE'))
    : getNumericStatValue(resolveTypedStat(mainMaterial?.stats.main, 'attack_speed', gearType.id), 0);
  const initialAttackSpeed = heterogeneousInitialAttackSpeed !== null
    ? heterogeneousInitialAttackSpeed
    : gearType.baseAttackSpeed + mainAttackSpeed;
  const baseAttackSpeed = computeNumberProperty(initialAttackSpeed, secondaryAttackSpeedMods);

  const mainHarvestSpeed = composedMain
    ? computeNumberProperty(0, applyEnhancementsToModifiers(composedMain.harvestSpeedMods, 'harvest_speed', 0, false, 0, 0, 'AVERAGE'))
    : getNumericStatValue(mainMaterial?.stats.main?.harvest_speed, 1.0);
  let initialHarvestSpeed = heterogeneousInitialHarvestSpeed !== null
    ? heterogeneousInitialHarvestSpeed
    : applyGradeBonus(mainHarvestSpeed, mainGradeMul);
  if (heterogeneousInitialHarvestSpeed === null && mainStarchargeLevel > 0) {
    initialHarvestSpeed = applyStarcharge(initialHarvestSpeed, 'harvest_speed', mainStarchargeLevel, mainChargingValue, 'AVERAGE');
  }
  const baseHarvestSpeed = computeNumberProperty(initialHarvestSpeed, secondaryHarvestSpeedMods);

  const initialRarity = composedMain
    ? computeNumberProperty(0, applyEnhancementsToModifiers(composedMain.rarityMods, 'rarity', 0, false, 0, 0, 'AVERAGE'))
    : getNumericStatValue(mainMaterial?.stats.main?.rarity, 0);
  const rarity = computeNumberProperty(initialRarity, secondaryRarityMods);

  // Aplicação final de Sinergia
  const finalDurability = Math.max(1, Math.round(baseDurability));
  const finalArmor = Number(baseArmor.toFixed(1));
  const finalArmorToughness = Number(baseArmorToughness.toFixed(1));
  const finalMagicArmor = Number(baseMagicArmor.toFixed(1));
  const finalKnockbackResistance = Number((baseKnockback / 10).toFixed(2));
  const finalDamage = Number(baseDamage.toFixed(1));
  // Limites da propriedade attack_speed no Silent Gear (GearProperties.java: [-3.9, 4.0])
  const finalAttackSpeed = Number(Math.min(4.0, Math.max(-3.9, baseAttackSpeed)).toFixed(2));
  const finalHarvestSpeed = Number(baseHarvestSpeed.toFixed(1));
  const finalDps = Number((finalDamage * finalAttackSpeed).toFixed(1));

  // Resolução de Traits cumulativos (acumula de todos os sub-materiais de cada slot)
  const traitLevelMap: Record<string, number> = {};
  for (const slot of Object.keys(build.parts) as PartSlot[]) {
    const sel = build.parts[slot];
    if (!sel) continue;
    const subMats: Material[] = (sel.materials && sel.materials.length > 0)
      ? sel.materials.map((m) => catalog.materials[m.materialId]).filter(Boolean)
      : (catalog.materials[sel.materialId] ? [catalog.materials[sel.materialId]] : []);

    for (const mat of subMats) {
      const traits = mat.traits[slot] || [];
      for (const t of traits) {
        traitLevelMap[t.name] = (traitLevelMap[t.name] || 0) + t.level;
      }
    }
  }

  const calculatedTraits: CalculatedTrait[] = [];
  for (const [traitId, totalLevel] of Object.entries(traitLevelMap)) {
    const info: TraitInfo = catalog.traits[traitId] || {
      id: traitId,
      maxLevel: 5,
      name: { en: traitId.replace(/^.*:/, ''), pt: traitId.replace(/^.*:/, '') },
      description: { en: 'In-game trait effect', pt: 'Efeito de habilidade do item' },
    };
    calculatedTraits.push({
      id: traitId,
      name: info.name,
      level: Math.min(totalLevel, info.maxLevel),
      maxLevel: info.maxLevel,
      description: info.description,
    });
  }

  return {
    durability: finalDurability,
    armor: finalArmor,
    armorToughness: finalArmorToughness,
    magicArmor: finalMagicArmor,
    knockbackResistance: finalKnockbackResistance,
    meleeDamage: finalDamage,
    attackSpeed: finalAttackSpeed,
    dps: finalDps,
    harvestSpeed: finalHarvestSpeed,
    harvestTier,
    synergy: Number((mainSynergy * 100).toFixed(0)),
    rarity: Math.round(rarity),
    traits: calculatedTraits,
  };
}
