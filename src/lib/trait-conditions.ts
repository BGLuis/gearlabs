import { GearBuild, Material, MaterialTraitRef, PartSlot, TraitCondition, VersionCatalog } from '@/types/silentgear';
import { getGearTypeAncestors } from './gear-type-hierarchy';
import { getPartInstanceCount } from './parts';

interface ConditionContext {
  gearTypeId: string;
  /** false no contexto de material (liga), onde a condição de gear_type sempre vale. */
  enforceGearType: boolean;
  componentCount: number;
  /** Componentes que possuem o trait avaliado (MaterialRatio/MaterialCountTraitCondition). */
  componentsWithTrait: number;
}

function matchesGearType(gearTypeId: string, required: string): boolean {
  return getGearTypeAncestors(gearTypeId).includes(required.replace(/^silentgear:/, ''));
}

export function evaluateTraitCondition(condition: TraitCondition, ctx: ConditionContext): boolean {
  switch (condition.type) {
    case 'silentgear:material_ratio':
      return ctx.componentCount > 0 && ctx.componentsWithTrait / ctx.componentCount >= condition.ratio;
    case 'silentgear:material_count':
      return ctx.componentsWithTrait >= condition.count;
    case 'silentgear:gear_type':
      return !ctx.enforceGearType || matchesGearType(ctx.gearTypeId, condition.gear_type);
    case 'silentgear:or':
      return condition.values.some((c) => evaluateTraitCondition(c, ctx));
    case 'silentgear:and':
      return condition.values.every((c) => evaluateTraitCondition(c, ctx));
    case 'silentgear:not':
      return !evaluateTraitCondition(condition.value, ctx);
    default:
      return true;
  }
}

function allMatch(conditions: TraitCondition[] | undefined, ctx: ConditionContext): boolean {
  return (conditions ?? []).every((c) => evaluateTraitCondition(c, ctx));
}

function hasTrait(material: Material, slot: PartSlot, traitId: string): boolean {
  return (material.traits[slot] ?? []).some((t) => t.name === traitId);
}

/**
 * Traits do item que o jogo mantém (Silent Gear 4.2.3):
 * - condições do material (material_ratio, material_count, gear_type) valem no contexto da parte;
 *   numa liga os componentes são os submateriais e gear_type sempre passa; num material puro
 *   os componentes são as instâncias da parte e gear_type só é checado na parte principal;
 * - condições da definição do trait (gear_type) valem sempre para o tipo do item.
 */
export function collectActiveTraits(build: GearBuild, catalog: VersionCatalog): MaterialTraitRef[] {
  const active: MaterialTraitRef[] = [];

  for (const slot of Object.keys(build.parts) as PartSlot[]) {
    const selection = build.parts[slot];
    if (!selection) continue;

    const isAlloy = !!selection.materials && selection.materials.length > 1;
    const components: Material[] = isAlloy
      ? selection.materials!.map((m) => catalog.materials[m.materialId]).filter(Boolean)
      : catalog.materials[selection.materialId]
      ? [catalog.materials[selection.materialId]]
      : [];
    const instanceCount = isAlloy ? components.length : getPartInstanceCount(build.gearTypeId, slot);

    for (const material of components) {
      for (const ref of material.traits[slot] ?? []) {
        const ctx: ConditionContext = {
          gearTypeId: build.gearTypeId,
          enforceGearType: !isAlloy && slot === 'main',
          componentCount: instanceCount,
          componentsWithTrait: isAlloy
            ? components.filter((c) => hasTrait(c, slot, ref.name)).length
            : instanceCount,
        };
        if (!allMatch(ref.conditions, ctx)) continue;

        const definition = catalog.traits[ref.name];
        if (!allMatch(definition?.conditions, { ...ctx, enforceGearType: true })) continue;

        active.push({ name: ref.name, level: ref.level });
      }
    }
  }

  return active;
}
