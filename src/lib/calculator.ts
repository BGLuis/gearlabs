import {
  CalculatedGearStats,
  CalculatedTrait,
  GearBuild,
  GearType,
  GRADE_MULTIPLIERS,
  Material,
  PartSlot,
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

  // Stats base derivados do main
  const mainGradeMul = mainSelection?.grade ? (GRADE_MULTIPLIERS[mainSelection.grade] || 0) : 0;

  let baseDurability = applyGradeBonus(
    (mainMaterial?.stats.main?.durability ?? 100) * gearType.durabilityMultiplier,
    mainGradeMul
  );
  let baseArmor = applyGradeBonus(mainMaterial?.stats.main?.armor ?? 0, mainGradeMul);
  let baseArmorToughness = applyGradeBonus(mainMaterial?.stats.main?.armor_toughness ?? 0, mainGradeMul);
  let baseMagicArmor = applyGradeBonus(mainMaterial?.stats.main?.magic_armor ?? 0, mainGradeMul);
  let baseDamage = applyGradeBonus(
    gearType.baseDamage + (mainMaterial?.stats.main?.melee_damage ?? 0),
    mainGradeMul
  );
  let baseAttackSpeed = gearType.baseAttackSpeed + (mainMaterial?.stats.main?.attack_speed ?? 0);
  let baseHarvestSpeed = applyGradeBonus(
    mainMaterial?.stats.main?.harvest_speed ?? 1.0,
    mainGradeMul
  );
  let harvestTier = mainMaterial?.stats.main?.harvest_tier || mainMaterial?.harvest_tier || 'minecraft:wood';
  let rarity = mainMaterial?.stats.main?.rarity ?? 0;

  // Aplicar modificadores de outros slots (rod, tip, coating, grip, lining, binding)
  for (const slot of Object.keys(build.parts) as PartSlot[]) {
    if (slot === 'main') continue;
    const sel = build.parts[slot];
    if (!sel) continue;
    const mat = catalog.materials[sel.materialId];
    if (!mat) continue;

    const slotGradeMul = sel.grade ? (GRADE_MULTIPLIERS[sel.grade] || 0) : 0;

    // Stat additions do slot
    const slotStats = mat.stats[slot];
    if (slotStats) {
      if (slotStats.durability) baseDurability += applyGradeBonus(slotStats.durability, slotGradeMul);
      if (slotStats.melee_damage) baseDamage += applyGradeBonus(slotStats.melee_damage, slotGradeMul);
      if (slotStats.armor) baseArmor += applyGradeBonus(slotStats.armor, slotGradeMul);
      if (slotStats.armor_toughness) baseArmorToughness += applyGradeBonus(slotStats.armor_toughness, slotGradeMul);
      if (slotStats.harvest_speed) baseHarvestSpeed += applyGradeBonus(slotStats.harvest_speed, slotGradeMul);
      if (slotStats.rarity) rarity += slotStats.rarity;
      if (slotStats.harvest_tier) harvestTier = slotStats.harvest_tier;
    }

    // Modificadores multiplicativos (ex: rod multipliers)
    const slotMods = mat.statModifiers?.[slot];
    if (slotMods) {
      if (slotMods.durability) {
        if (slotMods.durability.add) baseDurability += applyGradeBonus(slotMods.durability.add, slotGradeMul);
        if (slotMods.durability.mul2) baseDurability *= (1 + slotMods.durability.mul2);
      }
      if (slotMods.harvest_speed) {
        if (slotMods.harvest_speed.add) baseHarvestSpeed += applyGradeBonus(slotMods.harvest_speed.add, slotGradeMul);
        if (slotMods.harvest_speed.mul2) baseHarvestSpeed *= (1 + slotMods.harvest_speed.mul2);
      }
      if (slotMods.attack_speed) {
        if (slotMods.attack_speed.add) baseAttackSpeed += slotMods.attack_speed.add;
      }
    }
  }

  // Aplicação final de Sinergia
  const finalDurability = Math.max(1, Math.round(baseDurability * synergy));
  const finalArmor = Number((baseArmor * synergy).toFixed(1));
  const finalArmorToughness = Number((baseArmorToughness * synergy).toFixed(1));
  const finalMagicArmor = Number((baseMagicArmor * synergy).toFixed(1));
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
