import {
  ArmorPiece,
  CalculatedGearStats,
  CalculatedTrait,
  GearBuild,
  GearType,
  GRADE_MULTIPLIERS,
  Material,
  MaterialTraitRef,
  PartSlot,
  StatModifier,
  StatModifierEntry,
  StatOperation,
  StatValueModifier,
  TraitInfo,
  VersionCatalog,
} from '@/types/silentgear';

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
 * Calcula a sinergia de materiais compostos conforme SynergyUtils.java oficial (Silent Gear 4.2.3):
 * - Bônus base da curva de materiais únicos: 1.1 * (x / (x + 1.1)) + 1 / (1 + 1.1)
 * - Penalidade de -0.2 se os materiais não compartilharem ao menos uma categoria em comum
 * - Bônus para categorias compartilhadas: 0.015 * (k / (materiais.length - uniqueCount + 1)) para cada contagem k > 1
 * - Penalidade pela diferença de raridade em relação ao material primário: 0.001 * |primaryRarity - rarity|
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

  // 4. Penalidade de diferença de raridade
  const primary = materials[0];
  const primaryRarity = getNumericStatValue(
    primary.stats[partSlot]?.rarity ?? primary.stats.main?.rarity,
    0
  );
  const maxRarity = Math.max(
    0,
    ...materials.map((m) =>
      getNumericStatValue(m.stats[partSlot]?.rarity ?? m.stats.main?.rarity, 0)
    )
  );

  if (maxRarity > 0) {
    for (const mat of uniqueMaterials) {
      const rarity = getNumericStatValue(
        mat.stats[partSlot]?.rarity ?? mat.stats.main?.rarity,
        0
      );
      synergy -= 0.001 * Math.abs(primaryRarity - rarity); // RARITY_WEIGHT
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
 * Compõe as propriedades de um slot feito de múltiplos sub-materiais (liga ou tecido misto),
 * aplicando média ponderada e sinergia de SynergyUtils antes do fluxo canônico.
 */
export function composeCompoundSlotModifiers(
  subMaterials: Material[],
  slot: PartSlot,
  isArmor: boolean,
  gearPieceId?: string
) {
  const isMain = slot === 'main';
  const defaultOp: NormalizedOperation = isMain ? 'AVERAGE' : 'ADD';
  const synergy = calculateSynergy(subMaterials, slot);

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
    if (!affectedBySynergy || Math.abs(synergy - 1.0) < 1e-6) {
      return compressed;
    }
    return compressed.map((m) => ({
      ...m,
      value: applySynergyBonus(m.value, synergy),
    }));
  }

  // Armor
  const armorMods = processStat((mat) => {
    const stats = mat.stats[slot];
    if (!stats) return undefined;
    return isArmor && stats.armor_by_piece?.[gearPieceId as ArmorPiece] !== undefined
      ? stats.armor_by_piece[gearPieceId as ArmorPiece]
      : stats.armor;
  }, true);

  // Toughness
  const toughnessMods = processStat((mat) => mat.stats[slot]?.armor_toughness, true);

  // Magic Armor
  const magicArmorMods = processStat((mat) => mat.stats[slot]?.magic_armor, true);

  // Knockback Resistance
  const knockbackMods = processStat((mat) => mat.stats[slot]?.knockback_resistance, true);

  // Durability (no caso de armadura, usa armor_durability se disponível)
  const durabilityMods = processStat((mat) => {
    const stats = mat.stats[slot];
    if (!stats) return undefined;
    if (isArmor) {
      return stats.armor_durability ?? stats.durability;
    }
    return stats.durability;
  }, true);

  // Melee Damage
  const meleeDamageMods = processStat((mat) => mat.stats[slot]?.melee_damage, true);

  // Attack Speed (não afetado por sinergia)
  const attackSpeedMods = processStat((mat) => mat.stats[slot]?.attack_speed, false);

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

  // Traits
  const traits: MaterialTraitRef[] = [];
  for (const mat of subMaterials) {
    const matTraits = mat.traits[slot] || [];
    traits.push(...matTraits);
  }

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

  const mainSubMaterials: Material[] = (mainSelection?.materials && mainSelection.materials.length > 0)
    ? mainSelection.materials.map((m) => catalog.materials[m.materialId]).filter(Boolean)
    : (mainSelection && catalog.materials[mainSelection.materialId] ? [catalog.materials[mainSelection.materialId]] : []);

  const isMainCompound = mainSubMaterials.length > 1;
  const mainMaterial = mainSubMaterials[0] || null;

  let mainSynergy = 1.0;
  let composedMain: ReturnType<typeof composeCompoundSlotModifiers> | null = null;
  if (isMainCompound) {
    composedMain = composeCompoundSlotModifiers(mainSubMaterials, 'main', isArmor, gearType.id);
    mainSynergy = composedMain.synergy;
  }

  const mainGradeMul = mainSelection?.grade ? (GRADE_MULTIPLIERS[mainSelection.grade] || 0) : 0;
  const mainStarchargeLevel = mainSelection?.starcharge || 0;
  const mainChargingValue = getNumericStatValue(mainMaterial?.stats.main?.charging_value, 0);

  // 1. ARMOR
  const armorMods: ComputedModifier[] = [];
  if (composedMain) {
    armorMods.push(...applyEnhancementsToModifiers(composedMain.armorMods, 'armor', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
  } else if (mainMaterial?.stats.main) {
    const mainArmorRaw = (isArmor && mainMaterial.stats.main.armor_by_piece?.[gearType.id as ArmorPiece] !== undefined)
      ? mainMaterial.stats.main.armor_by_piece[gearType.id as ArmorPiece]
      : mainMaterial.stats.main.armor;
    const rawMods = extractModifiers(mainArmorRaw, 'AVERAGE');
    armorMods.push(...applyEnhancementsToModifiers(rawMods, 'armor', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
  }

  // 2. ARMOR TOUGHNESS
  const toughnessMods: ComputedModifier[] = [];
  if (composedMain) {
    toughnessMods.push(...applyEnhancementsToModifiers(composedMain.toughnessMods, 'armor_toughness', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
  } else if (mainMaterial?.stats.main?.armor_toughness !== undefined) {
    const rawMods = extractModifiers(mainMaterial.stats.main.armor_toughness, 'AVERAGE');
    toughnessMods.push(...applyEnhancementsToModifiers(rawMods, 'armor_toughness', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
  }

  // 3. MAGIC ARMOR
  const magicArmorMods: ComputedModifier[] = [];
  if (composedMain) {
    magicArmorMods.push(...applyEnhancementsToModifiers(composedMain.magicArmorMods, 'magic_armor', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
  } else if (mainMaterial?.stats.main?.magic_armor !== undefined) {
    const rawMods = extractModifiers(mainMaterial.stats.main.magic_armor, 'AVERAGE');
    magicArmorMods.push(...applyEnhancementsToModifiers(rawMods, 'magic_armor', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
  }

  // 4. KNOCKBACK RESISTANCE
  const knockbackMods: ComputedModifier[] = [];
  if (composedMain) {
    knockbackMods.push(...applyEnhancementsToModifiers(composedMain.knockbackMods, 'knockback_resistance', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
  } else if (mainMaterial?.stats.main?.knockback_resistance !== undefined) {
    const rawMods = extractModifiers(mainMaterial.stats.main.knockback_resistance, 'AVERAGE');
    knockbackMods.push(...applyEnhancementsToModifiers(rawMods, 'knockback_resistance', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
  }

  // 5. DURABILITY
  const armorDurMods: ComputedModifier[] = [];
  let flatDurabilityAdditions = 0;
  const toolDurMods: ComputedModifier[] = [];

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
    const mainArmorDurRaw = mainMaterial?.stats.main?.armor_durability ?? mainMaterial?.stats.main?.durability ?? 100;
    const rawMods = extractModifiers(mainArmorDurRaw, 'AVERAGE');
    armorDurMods.push(...applyEnhancementsToModifiers(rawMods, 'armor_durability', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
  } else {
    const rawMainMods = extractModifiers(mainMaterial?.stats.main?.durability ?? 100, 'AVERAGE');
    const scaledMainMods = rawMainMods.map((m) => ({ ...m, value: m.value * gearType.durabilityMultiplier }));
    toolDurMods.push(...applyEnhancementsToModifiers(scaledMainMods, 'durability', mainGradeMul, true, mainStarchargeLevel, mainChargingValue, 'AVERAGE'));
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

    const slotSubMaterials: Material[] = (sel.materials && sel.materials.length > 0)
      ? sel.materials.map((m) => catalog.materials[m.materialId]).filter(Boolean)
      : (catalog.materials[sel.materialId] ? [catalog.materials[sel.materialId]] : []);

    if (slotSubMaterials.length === 0) continue;

    const isSlotCompound = slotSubMaterials.length > 1;
    const slotGradeMul = sel.grade ? (GRADE_MULTIPLIERS[sel.grade] || 0) : 0;
    const slotStarchargeLevel = sel.starcharge || 0;
    const mat = slotSubMaterials[0];
    const slotChargingValue = getNumericStatValue(mat?.stats.main?.charging_value, 0);

    if (isSlotCompound) {
      const composedSlot = composeCompoundSlotModifiers(slotSubMaterials, slot, isArmor, gearType.id);

      if (composedSlot.armorMods.length > 0) {
        armorMods.push(...applyEnhancementsToModifiers(composedSlot.armorMods, 'armor', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
      }
      if (composedSlot.toughnessMods.length > 0) {
        toughnessMods.push(...applyEnhancementsToModifiers(composedSlot.toughnessMods, 'armor_toughness', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
      }
      if (composedSlot.magicArmorMods.length > 0) {
        magicArmorMods.push(...applyEnhancementsToModifiers(composedSlot.magicArmorMods, 'magic_armor', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
      }
      if (composedSlot.knockbackMods.length > 0) {
        knockbackMods.push(...applyEnhancementsToModifiers(composedSlot.knockbackMods, 'knockback_resistance', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
      }
      if (composedSlot.durabilityMods.length > 0) {
        if (isArmor) {
          for (const dm of composedSlot.durabilityMods) {
            const op = normalizeOperation(dm.operation, 'ADD');
            if (op === 'MULTIPLY_TOTAL' || op === 'MULTIPLY_BASE') {
              armorDurMods.push(...applyEnhancementsToModifiers([dm], 'durability', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, op));
            } else {
              let val = applyGradeBonus(dm.value, slotGradeMul);
              val = applyStarcharge(val, 'durability', slotStarchargeLevel, slotChargingValue, op);
              flatDurabilityAdditions += val;
            }
          }
        } else {
          toolDurMods.push(...applyEnhancementsToModifiers(composedSlot.durabilityMods, 'durability', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
        }
      }
      if (composedSlot.meleeDamageMods.length > 0) {
        secondaryDamageMods.push(...applyEnhancementsToModifiers(composedSlot.meleeDamageMods, 'melee_damage', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
      }
      if (composedSlot.attackSpeedMods.length > 0) {
        secondaryAttackSpeedMods.push(...applyEnhancementsToModifiers(composedSlot.attackSpeedMods, 'attack_speed', slotGradeMul, false, slotStarchargeLevel, slotChargingValue, 'ADD'));
      }
      if (composedSlot.harvestSpeedMods.length > 0) {
        secondaryHarvestSpeedMods.push(...applyEnhancementsToModifiers(composedSlot.harvestSpeedMods, 'harvest_speed', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
      }
      if (composedSlot.rarityMods.length > 0) {
        secondaryRarityMods.push(...applyEnhancementsToModifiers(composedSlot.rarityMods, 'rarity', slotGradeMul, false, slotStarchargeLevel, slotChargingValue, 'ADD'));
      }
      if (composedSlot.harvestTier) {
        harvestTier = composedSlot.harvestTier;
      }
    } else {
      const slotStats = mat.stats[slot];
      const slotMods = mat.statModifiers?.[slot];

      if (slotStats) {
        // Armor
        const slotArmorRaw = (isArmor && slotStats.armor_by_piece?.[gearType.id as ArmorPiece] !== undefined)
          ? slotStats.armor_by_piece[gearType.id as ArmorPiece]
          : slotStats.armor;
        if (slotArmorRaw !== undefined) {
          armorMods.push(...applyEnhancementsToModifiers(extractModifiers(slotArmorRaw, 'ADD'), 'armor', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
        }

        // Toughness
        if (slotStats.armor_toughness !== undefined) {
          toughnessMods.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.armor_toughness, 'ADD'), 'armor_toughness', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
        }

        // Magic armor
        if (slotStats.magic_armor !== undefined) {
          magicArmorMods.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.magic_armor, 'ADD'), 'magic_armor', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
        }

        // Knockback resistance
        if (slotStats.knockback_resistance !== undefined) {
          knockbackMods.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.knockback_resistance, 'ADD'), 'knockback_resistance', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
        }

        // Durability
        if (isArmor) {
          if (slotStats.armor_durability !== undefined) {
            armorDurMods.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.armor_durability, 'ADD'), 'armor_durability', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
          } else if (slotStats.durability !== undefined) {
            const durMods = extractModifiers(slotStats.durability, 'ADD');
            for (const dm of durMods) {
              const op = normalizeOperation(dm.operation, 'ADD');
              if (op === 'MULTIPLY_TOTAL' || op === 'MULTIPLY_BASE') {
                armorDurMods.push(...applyEnhancementsToModifiers([dm], 'durability', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, op));
              } else {
                let val = applyGradeBonus(dm.value, slotGradeMul);
                val = applyStarcharge(val, 'durability', slotStarchargeLevel, slotChargingValue, op);
                flatDurabilityAdditions += val;
              }
            }
          }
        } else {
          if (slotStats.durability !== undefined) {
            toolDurMods.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.durability, 'ADD'), 'durability', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
          }
        }

        // Melee damage
        if (slotStats.melee_damage !== undefined) {
          secondaryDamageMods.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.melee_damage, 'ADD'), 'melee_damage', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
        }

        // Attack speed (not affected by grades)
        if (slotStats.attack_speed !== undefined) {
          secondaryAttackSpeedMods.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.attack_speed, 'ADD'), 'attack_speed', slotGradeMul, false, slotStarchargeLevel, slotChargingValue, 'ADD'));
        }

        // Harvest speed
        if (slotStats.harvest_speed !== undefined) {
          secondaryHarvestSpeedMods.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.harvest_speed, 'ADD'), 'harvest_speed', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
        }

        // Rarity
        if (slotStats.rarity !== undefined) {
          secondaryRarityMods.push(...applyEnhancementsToModifiers(extractModifiers(slotStats.rarity, 'ADD'), 'rarity', slotGradeMul, false, slotStarchargeLevel, slotChargingValue, 'ADD'));
        }

        if (slotStats.harvest_tier) {
          harvestTier = slotStats.harvest_tier;
        }
      }

      // statModifiers legados (rod multipliers, etc.)
      if (slotMods) {
        if (slotMods.durability) {
          const legacyMods = extractLegacyStatModifiers(slotMods.durability);
          if (isArmor) {
            for (const lm of legacyMods) {
              const op = normalizeOperation(lm.operation, 'ADD');
              if (op === 'MULTIPLY_TOTAL' || op === 'MULTIPLY_BASE') {
                armorDurMods.push(...applyEnhancementsToModifiers([lm], 'durability', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, op));
              } else {
                let val = applyGradeBonus(lm.value, slotGradeMul);
                val = applyStarcharge(val, 'durability', slotStarchargeLevel, slotChargingValue, op);
                flatDurabilityAdditions += val;
              }
            }
          } else {
            toolDurMods.push(...applyEnhancementsToModifiers(legacyMods, 'durability', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
          }
        }

        if (slotMods.harvest_speed) {
          const legacyMods = extractLegacyStatModifiers(slotMods.harvest_speed);
          secondaryHarvestSpeedMods.push(...applyEnhancementsToModifiers(legacyMods, 'harvest_speed', slotGradeMul, true, slotStarchargeLevel, slotChargingValue, 'ADD'));
        }

        if (slotMods.attack_speed) {
          const legacyMods = extractLegacyStatModifiers(slotMods.attack_speed);
          secondaryAttackSpeedMods.push(...applyEnhancementsToModifiers(legacyMods, 'attack_speed', slotGradeMul, false, slotStarchargeLevel, slotChargingValue, 'ADD'));
        }
      }
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
    baseDurability = Math.round(finalArmorDurability * gearType.durabilityMultiplier) + flatDurabilityAdditions;
  } else {
    baseDurability = computeNumberProperty(0, toolDurMods);
  }

  const mainMeleeDamage = composedMain
    ? computeNumberProperty(0, applyEnhancementsToModifiers(composedMain.meleeDamageMods, 'melee_damage', 0, false, 0, 0, 'AVERAGE'))
    : getNumericStatValue(mainMaterial?.stats.main?.melee_damage, 0);
  let initialDamage = applyGradeBonus(
    gearType.baseDamage + mainMeleeDamage,
    mainGradeMul
  );
  if (mainStarchargeLevel > 0) {
    initialDamage = applyStarcharge(initialDamage, 'melee_damage', mainStarchargeLevel, mainChargingValue, 'ADD');
  }
  const baseDamage = computeNumberProperty(initialDamage, secondaryDamageMods);

  const mainAttackSpeed = composedMain
    ? computeNumberProperty(0, applyEnhancementsToModifiers(composedMain.attackSpeedMods, 'attack_speed', 0, false, 0, 0, 'AVERAGE'))
    : getNumericStatValue(mainMaterial?.stats.main?.attack_speed, 0);
  const initialAttackSpeed = gearType.baseAttackSpeed + mainAttackSpeed;
  const baseAttackSpeed = computeNumberProperty(initialAttackSpeed, secondaryAttackSpeedMods);

  const mainHarvestSpeed = composedMain
    ? computeNumberProperty(0, applyEnhancementsToModifiers(composedMain.harvestSpeedMods, 'harvest_speed', 0, false, 0, 0, 'AVERAGE'))
    : getNumericStatValue(mainMaterial?.stats.main?.harvest_speed, 1.0);
  let initialHarvestSpeed = applyGradeBonus(
    mainHarvestSpeed,
    mainGradeMul
  );
  if (mainStarchargeLevel > 0) {
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
  const finalAttackSpeed = Number(Math.max(0.4, baseAttackSpeed).toFixed(2));
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
