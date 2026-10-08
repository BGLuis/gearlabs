import {
  ArmorPiece,
  CalculatedGearStats,
  CalculatedTrait,
  GearBuild,
  GearType,
  GRADE_MULTIPLIERS,
  Material,
  PartSlot,
  StatModifier,
  StatModifierEntry,
  StatOperation,
  StatValueModifier,
  TraitInfo,
  VersionCatalog,
} from '@/types/silentgear';

/**
 * Calcula a sinergia de materiais.
 * No Silent Gear oficial, a sinergia só se aplica internamente a sub-materiais de
 * materiais compostos (ligas/tecidos mistos via SynergyUtils.java).
 * Partes de material simples utilizam sinergia neutra de 1.0 (100%).
 */
export function calculateSynergy(
  materials: Material[]
): number {
  if (materials.length <= 1) return 1.0;
  // TODO(#8): Implementar SynergyUtils.getSynergy para materiais compostos.
  return 1.0;
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

export function calculateGearStats(
  build: GearBuild,
  catalog: VersionCatalog
): CalculatedGearStats {
  const gearType = catalog.gearTypes[build.gearTypeId];
  if (!gearType) {
    throw new Error(`GearType '${build.gearTypeId}' not found in catalog.`);
  }

  const mainSelection = build.parts.main;
  const mainMaterial = mainSelection ? catalog.materials[mainSelection.materialId] : null;

  // Sinergia no Silent Gear aplica-se internamente a materiais compostos (Issue #8).
  // Equipamentos e peças com materiais simples têm sinergia neutra de 1.0 (100%).
  const synergy = 1.0;

  const mainGradeMul = mainSelection?.grade ? (GRADE_MULTIPLIERS[mainSelection.grade] || 0) : 0;

  // 1. ARMOR
  const armorMods: ComputedModifier[] = [];
  if (mainMaterial?.stats.main) {
    const mainArmorRaw = (gearType.category === 'armor' && mainMaterial.stats.main.armor_by_piece?.[gearType.id as ArmorPiece] !== undefined)
      ? mainMaterial.stats.main.armor_by_piece[gearType.id as ArmorPiece]
      : mainMaterial.stats.main.armor;
    const rawMods = extractModifiers(mainArmorRaw, 'AVERAGE');
    armorMods.push(...applyGradeToModifiers(rawMods, mainGradeMul, true, 'AVERAGE'));
  }

  // 2. ARMOR TOUGHNESS
  const toughnessMods: ComputedModifier[] = [];
  if (mainMaterial?.stats.main?.armor_toughness !== undefined) {
    const rawMods = extractModifiers(mainMaterial.stats.main.armor_toughness, 'AVERAGE');
    toughnessMods.push(...applyGradeToModifiers(rawMods, mainGradeMul, true, 'AVERAGE'));
  }

  // 3. MAGIC ARMOR
  const magicArmorMods: ComputedModifier[] = [];
  if (mainMaterial?.stats.main?.magic_armor !== undefined) {
    const rawMods = extractModifiers(mainMaterial.stats.main.magic_armor, 'AVERAGE');
    magicArmorMods.push(...applyGradeToModifiers(rawMods, mainGradeMul, true, 'AVERAGE'));
  }

  // 4. KNOCKBACK RESISTANCE
  const knockbackMods: ComputedModifier[] = [];
  if (mainMaterial?.stats.main?.knockback_resistance !== undefined) {
    const rawMods = extractModifiers(mainMaterial.stats.main.knockback_resistance, 'AVERAGE');
    knockbackMods.push(...applyGradeToModifiers(rawMods, mainGradeMul, true, 'AVERAGE'));
  }

  // 5. DURABILITY
  const isArmor = gearType.category === 'armor';
  const armorDurMods: ComputedModifier[] = [];
  let flatDurabilityAdditions = 0;
  const toolDurMods: ComputedModifier[] = [];

  if (isArmor) {
    const mainArmorDurRaw = mainMaterial?.stats.main?.armor_durability ?? mainMaterial?.stats.main?.durability ?? 100;
    const rawMods = extractModifiers(mainArmorDurRaw, 'AVERAGE');
    armorDurMods.push(...applyGradeToModifiers(rawMods, mainGradeMul, true, 'AVERAGE'));
  } else {
    const rawMainMods = extractModifiers(mainMaterial?.stats.main?.durability ?? 100, 'AVERAGE');
    const scaledMainMods = rawMainMods.map((m) => ({ ...m, value: m.value * gearType.durabilityMultiplier }));
    toolDurMods.push(...applyGradeToModifiers(scaledMainMods, mainGradeMul, true, 'AVERAGE'));
  }

  // 6. DAMAGE, ATTACK SPEED, HARVEST SPEED, RARITY
  const secondaryDamageMods: ComputedModifier[] = [];
  const secondaryAttackSpeedMods: ComputedModifier[] = [];
  const secondaryHarvestSpeedMods: ComputedModifier[] = [];
  const secondaryRarityMods: ComputedModifier[] = [];

  let harvestTier = mainMaterial?.stats.main?.harvest_tier || mainMaterial?.harvest_tier || 'minecraft:wood';

  // Processar slots secundários
  for (const slot of Object.keys(build.parts) as PartSlot[]) {
    if (slot === 'main') continue;
    const sel = build.parts[slot];
    if (!sel) continue;
    const mat = catalog.materials[sel.materialId];
    if (!mat) continue;

    const slotGradeMul = sel.grade ? (GRADE_MULTIPLIERS[sel.grade] || 0) : 0;
    const slotStats = mat.stats[slot];
    const slotMods = mat.statModifiers?.[slot];

    if (slotStats) {
      // Armor
      const slotArmorRaw = (isArmor && slotStats.armor_by_piece?.[gearType.id as ArmorPiece] !== undefined)
        ? slotStats.armor_by_piece[gearType.id as ArmorPiece]
        : slotStats.armor;
      if (slotArmorRaw !== undefined) {
        armorMods.push(...applyGradeToModifiers(extractModifiers(slotArmorRaw, 'ADD'), slotGradeMul, true, 'ADD'));
      }

      // Toughness
      if (slotStats.armor_toughness !== undefined) {
        toughnessMods.push(...applyGradeToModifiers(extractModifiers(slotStats.armor_toughness, 'ADD'), slotGradeMul, true, 'ADD'));
      }

      // Magic armor
      if (slotStats.magic_armor !== undefined) {
        magicArmorMods.push(...applyGradeToModifiers(extractModifiers(slotStats.magic_armor, 'ADD'), slotGradeMul, true, 'ADD'));
      }

      // Knockback resistance
      if (slotStats.knockback_resistance !== undefined) {
        knockbackMods.push(...applyGradeToModifiers(extractModifiers(slotStats.knockback_resistance, 'ADD'), slotGradeMul, true, 'ADD'));
      }

      // Durability
      if (isArmor) {
        if (slotStats.armor_durability !== undefined) {
          armorDurMods.push(...applyGradeToModifiers(extractModifiers(slotStats.armor_durability, 'ADD'), slotGradeMul, true, 'ADD'));
        } else if (slotStats.durability !== undefined) {
          const durMods = extractModifiers(slotStats.durability, 'ADD');
          for (const dm of durMods) {
            const op = normalizeOperation(dm.operation, 'ADD');
            if (op === 'MULTIPLY_TOTAL' || op === 'MULTIPLY_BASE') {
              armorDurMods.push(...applyGradeToModifiers([dm], slotGradeMul, true, op));
            } else {
              const val = applyGradeBonus(dm.value, slotGradeMul);
              flatDurabilityAdditions += val;
            }
          }
        }
      } else {
        if (slotStats.durability !== undefined) {
          toolDurMods.push(...applyGradeToModifiers(extractModifiers(slotStats.durability, 'ADD'), slotGradeMul, true, 'ADD'));
        }
      }

      // Melee damage
      if (slotStats.melee_damage !== undefined) {
        secondaryDamageMods.push(...applyGradeToModifiers(extractModifiers(slotStats.melee_damage, 'ADD'), slotGradeMul, true, 'ADD'));
      }

      // Attack speed (not affected by grades)
      if (slotStats.attack_speed !== undefined) {
        secondaryAttackSpeedMods.push(...applyGradeToModifiers(extractModifiers(slotStats.attack_speed, 'ADD'), slotGradeMul, false, 'ADD'));
      }

      // Harvest speed
      if (slotStats.harvest_speed !== undefined) {
        secondaryHarvestSpeedMods.push(...applyGradeToModifiers(extractModifiers(slotStats.harvest_speed, 'ADD'), slotGradeMul, true, 'ADD'));
      }

      // Rarity
      if (slotStats.rarity !== undefined) {
        secondaryRarityMods.push(...applyGradeToModifiers(extractModifiers(slotStats.rarity, 'ADD'), slotGradeMul, false, 'ADD'));
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
              armorDurMods.push(...applyGradeToModifiers([lm], slotGradeMul, true, op));
            } else {
              flatDurabilityAdditions += applyGradeBonus(lm.value, slotGradeMul);
            }
          }
        } else {
          toolDurMods.push(...applyGradeToModifiers(legacyMods, slotGradeMul, true, 'ADD'));
        }
      }

      if (slotMods.harvest_speed) {
        const legacyMods = extractLegacyStatModifiers(slotMods.harvest_speed);
        secondaryHarvestSpeedMods.push(...applyGradeToModifiers(legacyMods, slotGradeMul, true, 'ADD'));
      }

      if (slotMods.attack_speed) {
        const legacyMods = extractLegacyStatModifiers(slotMods.attack_speed);
        secondaryAttackSpeedMods.push(...applyGradeToModifiers(legacyMods, slotGradeMul, false, 'ADD'));
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

  const mainMeleeDamage = getNumericStatValue(mainMaterial?.stats.main?.melee_damage, 0);
  const initialDamage = applyGradeBonus(
    gearType.baseDamage + mainMeleeDamage,
    mainGradeMul
  );
  const baseDamage = computeNumberProperty(initialDamage, secondaryDamageMods);

  const mainAttackSpeed = getNumericStatValue(mainMaterial?.stats.main?.attack_speed, 0);
  const initialAttackSpeed = gearType.baseAttackSpeed + mainAttackSpeed;
  const baseAttackSpeed = computeNumberProperty(initialAttackSpeed, secondaryAttackSpeedMods);

  const mainHarvestSpeed = getNumericStatValue(mainMaterial?.stats.main?.harvest_speed, 1.0);
  const initialHarvestSpeed = applyGradeBonus(
    mainHarvestSpeed,
    mainGradeMul
  );
  const baseHarvestSpeed = computeNumberProperty(initialHarvestSpeed, secondaryHarvestSpeedMods);

  const initialRarity = getNumericStatValue(mainMaterial?.stats.main?.rarity, 0);
  const rarity = computeNumberProperty(initialRarity, secondaryRarityMods);

  // Aplicação final de Sinergia
  const finalDurability = Math.max(1, Math.round(baseDurability * synergy));
  const finalArmor = Number((baseArmor * synergy).toFixed(1));
  const finalArmorToughness = Number((baseArmorToughness * synergy).toFixed(1));
  const finalMagicArmor = Number((baseMagicArmor * synergy).toFixed(1));
  const finalKnockbackResistance = Number(((baseKnockback / 10) * synergy).toFixed(2));
  const finalDamage = Number((baseDamage * synergy).toFixed(1));
  const finalAttackSpeed = Number(Math.max(0.4, baseAttackSpeed).toFixed(2));
  const finalHarvestSpeed = Number((baseHarvestSpeed * synergy).toFixed(1));
  const finalDps = Number((finalDamage * finalAttackSpeed).toFixed(1));

  // Resolução de Traits cumulativos
  const traitLevelMap: Record<string, number> = {};
  for (const slot of Object.keys(build.parts) as PartSlot[]) {
    const sel = build.parts[slot];
    if (!sel) continue;
    const mat = catalog.materials[sel.materialId];
    if (!mat) continue;

    const traits = mat.traits[slot] || [];
    for (const t of traits) {
      traitLevelMap[t.name] = (traitLevelMap[t.name] || 0) + t.level;
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
    synergy: Number((synergy * 100).toFixed(0)),
    rarity: Math.round(rarity),
    traits: calculatedTraits,
  };
}
