import {
  GearPartSelection,
  SubMaterialSelection,
  AlloyType,
  Material,
  PartSlot,
  Grade,
  StarchargeLevel,
  PartMaterialInstance,
  GearCategory,
} from '@/types/silentgear';

export const MAX_SUB_MATERIALS = 6;

export interface AlloyConfig {
  id: AlloyType;
  name: { en: string; pt: string };
  machineName: { en: string; pt: string };
  blockId: string;
  maxIngredients: number;
  allowedCategories: string[];
  multiplier: number;
  description: { en: string; pt: string };
}

export const ALLOY_LIMITS: Record<AlloyType, number> = {
  metal: 6,
  gem: 6,
  fabric: 6,
  crude: 4,
  super: 8,
};

export const DEFAULT_ALLOY_TYPE: AlloyType = 'metal';

export const ALLOY_CONFIGS: Record<AlloyType, AlloyConfig> = {
  metal: {
    id: 'metal',
    name: { en: 'Metal Alloy', pt: 'Liga Metálica' },
    machineName: { en: 'Alloy Forge', pt: 'Forja de Ligas' },
    blockId: 'silentgear:alloy_forge',
    maxIngredients: 6,
    allowedCategories: ['metal', 'dust'],
    multiplier: 1.0,
    description: { en: 'Metals and dusts (up to 6 materials)', pt: 'Metais e pós (até 6 materiais)' },
  },
  gem: {
    id: 'gem',
    name: { en: 'Gem Alloy', pt: 'Liga de Gemas' },
    machineName: { en: 'Recrystallizer', pt: 'Recristalizador' },
    blockId: 'silentgear:recrystallizer',
    maxIngredients: 6,
    allowedCategories: ['gem', 'dust'],
    multiplier: 1.0,
    description: { en: 'Gems and dusts (up to 6 materials)', pt: 'Gemas e pós (até 6 materiais)' },
  },
  fabric: {
    id: 'fabric',
    name: { en: 'Mixed Fabric', pt: 'Tecido Misto' },
    machineName: { en: 'Refabricator', pt: 'Refabricador' },
    blockId: 'silentgear:refabricator',
    maxIngredients: 6,
    allowedCategories: ['cloth', 'fiber', 'slime'],
    multiplier: 1.0,
    description: { en: 'Cloth, fiber, and slime (up to 6 materials)', pt: 'Tecido, fibra e slime (até 6 materiais)' },
  },
  crude: {
    id: 'crude',
    name: { en: 'Crude Alloy', pt: 'Liga Crua' },
    machineName: { en: 'Crude Mixer', pt: 'Misturador Rude' },
    blockId: 'silentgear:crude_mixer',
    maxIngredients: 4,
    allowedCategories: [],
    multiplier: 0.8,
    description: { en: 'Any material (up to 4 materials, ×0.8 penalty)', pt: 'Qualquer material (até 4 materiais, penalidade de ×0.8)' },
  },
  super: {
    id: 'super',
    name: { en: 'Super Alloy', pt: 'Super Liga' },
    machineName: { en: 'Super Mixer', pt: 'Super Misturador' },
    blockId: 'silentgear:super_mixer',
    maxIngredients: 8,
    allowedCategories: [],
    multiplier: 1.0,
    description: { en: 'Any material (up to 8 materials)', pt: 'Qualquer material (até 8 materiais)' },
  },
};

export function getMaxSubMaterials(alloyType?: AlloyType): number {
  return alloyType ? ALLOY_LIMITS[alloyType] ?? 6 : 6;
}

export function isMaterialAllowedInAlloy(material: Material, alloyType: AlloyType): boolean {
  const config = ALLOY_CONFIGS[alloyType];
  if (!config || config.allowedCategories.length === 0) {
    return true;
  }
  const matCats = new Set([
    material.category,
    ...(material.categories || []),
  ].filter(Boolean));
  return config.allowedCategories.some((cat) => matCats.has(cat));
}

export interface AlloyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  incompatibleMaterials: Material[];
  exceedsLimit: boolean;
  maxLimit: number;
}

export function validateAlloy(
  materials: Material[],
  alloyType: AlloyType,
  lang: 'pt' | 'en' = 'pt'
): AlloyValidationResult {
  const config = ALLOY_CONFIGS[alloyType] || ALLOY_CONFIGS.metal;
  const maxLimit = config.maxIngredients;
  const errors: string[] = [];
  const warnings: string[] = [];
  const incompatibleMaterials: Material[] = [];

  for (const mat of materials) {
    if (!isMaterialAllowedInAlloy(mat, alloyType)) {
      incompatibleMaterials.push(mat);
    }
  }

  const exceedsLimit = materials.length > maxLimit;

  if (incompatibleMaterials.length > 0) {
    const matNames = incompatibleMaterials.map((m) => m.name[lang] || m.name.en).join(', ');
    const machine = config.machineName[lang] || config.machineName.en;
    const allowed = config.allowedCategories.join(', ');
    const msg = lang === 'pt'
      ? `A máquina ${machine} não aceita: ${matNames}. Categorias permitidas: ${allowed}.`
      : `The machine ${machine} does not accept: ${matNames}. Allowed categories: ${allowed}.`;
    errors.push(msg);
    warnings.push(msg);
  }

  if (exceedsLimit) {
    const machine = config.machineName[lang] || config.machineName.en;
    const msg = lang === 'pt'
      ? `A máquina ${machine} suporta no máximo ${maxLimit} materiais (foram fornecidos ${materials.length}).`
      : `The machine ${machine} supports at most ${maxLimit} materials (provided ${materials.length}).`;
    errors.push(msg);
    warnings.push(msg);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    incompatibleMaterials,
    exceedsLimit,
    maxLimit,
  };
}

export function detectAlloyType(materials: Material[]): AlloyType {
  if (!materials || materials.length === 0) return 'metal';
  if (materials.length > 6) return 'super';
  if (materials.every((m) => isMaterialAllowedInAlloy(m, 'metal'))) return 'metal';
  if (materials.every((m) => isMaterialAllowedInAlloy(m, 'gem'))) return 'gem';
  if (materials.every((m) => isMaterialAllowedInAlloy(m, 'fabric'))) return 'fabric';
  if (materials.length <= 4) return 'crude';
  return 'super';
}

/**
 * Adiciona um sub-material a uma parte, preservando grau, starcharge e tipo de liga.
 * Respeita o limite da máquina do tipo de liga.
 */
export function addPartSubMaterial(
  current: GearPartSelection | undefined,
  materialId: string,
  alloyType?: AlloyType
): GearPartSelection {
  const currentMaterials =
    current?.materials && current.materials.length > 0
      ? [...current.materials]
      : current?.materialId
        ? [{ materialId: current.materialId }]
        : [];

  const effectiveAlloyType = alloyType ?? current?.alloyType ?? DEFAULT_ALLOY_TYPE;
  const maxLimit = getMaxSubMaterials(effectiveAlloyType);

  if (currentMaterials.length >= maxLimit) {
    return current || { materialId, grade: 'NONE', starcharge: 0, alloyType: effectiveAlloyType };
  }

  const newMaterials: SubMaterialSelection[] = [...currentMaterials, { materialId }];

  return {
    ...current,
    materialId: newMaterials[0].materialId,
    grade: current?.grade || 'NONE',
    starcharge: current?.starcharge || 0,
    materials: newMaterials,
    alloyType: effectiveAlloyType,
  };
}

/**
 * Remove um sub-material de uma parte pelo índice.
 * - Retorna `null` se não restar nenhum sub-material (sinaliza remoção da parte).
 * - Se restar apenas 1 sub-material, converte de volta para material simples (materials: undefined).
 * - Preserva grau, starcharge e alloyType existentes.
 */
export function removePartSubMaterial(
  current: GearPartSelection | undefined,
  index: number
): GearPartSelection | null {
  if (!current?.materials || index < 0 || index >= current.materials.length) {
    return current || null;
  }

  const nextMaterials = current.materials.filter((_, i) => i !== index);

  if (nextMaterials.length === 0) {
    return null;
  }

  return {
    ...current,
    materialId: nextMaterials[0].materialId,
    grade: current.grade || 'NONE',
    starcharge: current.starcharge || 0,
    materials: nextMaterials.length > 1 ? nextMaterials : undefined,
    alloyType: current.alloyType,
  };
}

/**
 * Reordena sub-materiais mantendo todos os metadados da parte.
 */
export function reorderPartSubMaterials(
  current: GearPartSelection | undefined,
  fromIndex: number,
  toIndex: number
): GearPartSelection | undefined {
  if (!current?.materials || fromIndex === toIndex) return current;
  if (
    fromIndex < 0 ||
    fromIndex >= current.materials.length ||
    toIndex < 0 ||
    toIndex >= current.materials.length
  ) {
    return current;
  }

  const nextMaterials = [...current.materials];
  const [moved] = nextMaterials.splice(fromIndex, 1);
  nextMaterials.splice(toIndex, 0, moved);

  return {
    ...current,
    materialId: nextMaterials[0].materialId,
    materials: nextMaterials,
    alloyType: current.alloyType,
  };
}

/**
 * Atualiza um sub-material específico mantendo grau, starcharge e tipo de liga da parte.
 */
export function updatePartSubMaterial(
  current: GearPartSelection | undefined,
  index: number,
  materialId: string
): GearPartSelection | undefined {
  if (!current?.materials || index < 0 || index >= current.materials.length) return current;

  const nextMaterials = [...current.materials];
  nextMaterials[index] = { materialId };

  return {
    ...current,
    materialId: nextMaterials[0].materialId,
    materials: nextMaterials,
    alloyType: current.alloyType,
  };
}

/**
 * Define a lista completa de sub-materiais garantindo que starcharge, grau e tipo de liga sejam preservados.
 */
export function setPartSubMaterialsInPart(
  current: GearPartSelection | undefined,
  materials: SubMaterialSelection[],
  alloyType?: AlloyType
): GearPartSelection {
  const primary = materials[0];
  return {
    ...current,
    materialId: primary?.materialId || current?.materialId || '',
    grade: current?.grade || 'NONE',
    starcharge: current?.starcharge || 0,
    materials,
    alloyType: alloyType ?? current?.alloyType ?? DEFAULT_ALLOY_TYPE,
  };
}

/**
 * Atualiza o tipo de liga de uma parte.
 */
export function setPartAlloyTypeInPart(
  current: GearPartSelection | undefined,
  alloyType: AlloyType
): GearPartSelection {
  if (!current) {
    return { materialId: '', grade: 'NONE', starcharge: 0, alloyType };
  }
  return {
    ...current,
    alloyType,
  };
}

/**
 * Contagem padrão de instâncias de materiais por peça e slot no Silent Gear 4.2.3 (Issue #33).
 * Baseado nas receitas canônicas do mod (ex: 8 placas no peitoral, 5 no capacete, etc.).
 */
export const DEFAULT_PART_MATERIAL_COUNTS: Record<string, Partial<Record<PartSlot, number>>> = {
  helmet: { main: 5, tip: 1, lining: 1, coating: 1, binding: 1 },
  chestplate: { main: 8, tip: 1, lining: 1, coating: 1, binding: 1 },
  leggings: { main: 7, tip: 1, lining: 1, coating: 1, binding: 1 },
  boots: { main: 4, tip: 1, lining: 1, coating: 1, binding: 1 },
  sword: { main: 2, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  katana: { main: 3, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  machete: { main: 3, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  knife: { main: 1, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  dagger: { main: 1, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  spear: { main: 2, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  pickaxe: { main: 3, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  axe: { main: 3, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  shovel: { main: 1, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  hoe: { main: 2, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  hammer: { main: 8, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  excavator: { main: 6, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  saw: { main: 3, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  paxel: { main: 5, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  mattock: { main: 3, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  sickle: { main: 3, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  shears: { main: 2, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  bow: { main: 3, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  crossbow: { main: 3, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  slingshot: { main: 2, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  shield: { main: 6, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
  elytra: { main: 2, rod: 2, tip: 1, grip: 1, coating: 1, binding: 1 },
};

/**
 * Retorna o número canônico de instâncias de material que compõem uma parte no mod.
 */
export function getPartInstanceCount(gearTypeId: string, slot: PartSlot): number {
  return DEFAULT_PART_MATERIAL_COUNTS[gearTypeId]?.[slot] ?? (slot === 'rod' ? 2 : 1);
}

/**
 * Cria uma lista padrão de instâncias com contagem N repetindo o grau e starcharge padrão.
 */
export function createDefaultPartInstances(
  count: number,
  defaultGrade: Grade = 'NONE',
  defaultStarcharge: StarchargeLevel = 0
): PartMaterialInstance[] {
  const instances: PartMaterialInstance[] = [];
  for (let i = 0; i < count; i++) {
    instances.push({
      grade: defaultGrade,
      starcharge: defaultStarcharge,
    });
  }
  return instances;
}

/**
 * Sincroniza a lista de instâncias com o número alvo exigido pela parte.
 */
export function syncPartInstancesWithCount(
  current: GearPartSelection | undefined,
  targetCount: number
): PartMaterialInstance[] {
  const defaultGrade = current?.grade || 'NONE';
  const defaultStarcharge = current?.starcharge || 0;
  const existing = current?.instances || [];

  if (existing.length === targetCount) {
    return existing;
  }

  const result: PartMaterialInstance[] = [];
  for (let i = 0; i < targetCount; i++) {
    if (i < existing.length) {
      result.push({ ...existing[i] });
    } else {
      result.push({
        grade: defaultGrade,
        starcharge: defaultStarcharge,
      });
    }
  }
  return result;
}

/**
 * Atualiza o grau de uma instância individual da parte.
 */
export function updatePartInstanceGrade(
  current: GearPartSelection | undefined,
  index: number,
  grade: Grade,
  gearTypeId: string,
  slot: PartSlot
): GearPartSelection {
  const count = getPartInstanceCount(gearTypeId, slot);
  const instances = syncPartInstancesWithCount(current, count);
  if (index >= 0 && index < instances.length) {
    instances[index] = { ...instances[index], grade };
  }
  return {
    ...(current || { materialId: '' }),
    instances,
  };
}

/**
 * Atualiza a carga estelar de uma instância individual da parte.
 */
export function updatePartInstanceStarcharge(
  current: GearPartSelection | undefined,
  index: number,
  starcharge: StarchargeLevel,
  gearTypeId: string,
  slot: PartSlot
): GearPartSelection {
  const count = getPartInstanceCount(gearTypeId, slot);
  const instances = syncPartInstancesWithCount(current, count);
  if (index >= 0 && index < instances.length) {
    instances[index] = { ...instances[index], starcharge };
  }
  return {
    ...(current || { materialId: '' }),
    instances,
  };
}

/**
 * Define a lista completa de instâncias de uma parte.
 */
export function setPartInstancesInPart(
  current: GearPartSelection | undefined,
  instances: PartMaterialInstance[]
): GearPartSelection {
  return {
    ...(current || { materialId: '' }),
    instances,
  };
}

type MainPartKind = 'blade' | 'head' | 'plates';

const MAIN_PART_NAMES: Record<MainPartKind, { pt: string; en: string }> = {
  blade: { pt: 'Lâmina', en: 'Blade' },
  head: { pt: 'Cabeça', en: 'Head' },
  plates: { pt: 'Placas', en: 'Plates' },
};

const MAIN_PART_BY_GEAR_TYPE: Record<string, MainPartKind> = {
  sword: 'blade',
  katana: 'blade',
  pickaxe: 'head',
  axe: 'head',
  helmet: 'plates',
  chestplate: 'plates',
  leggings: 'plates',
  boots: 'plates',
};

// Fallback para tipos fora do catálogo oficial (ex.: ferramentas adicionadas por datapack)
const MAIN_PART_BY_CATEGORY: Partial<Record<GearCategory, MainPartKind>> = {
  weapon: 'blade',
  tool: 'head',
  armor: 'plates',
};

export function getMainPartLabel(
  gearTypeId: string | undefined,
  category: GearCategory | undefined,
  lang: 'pt' | 'en'
): string {
  const kind =
    (gearTypeId && MAIN_PART_BY_GEAR_TYPE[gearTypeId]) ||
    (category && MAIN_PART_BY_CATEGORY[category]) ||
    'blade';
  return MAIN_PART_NAMES[kind][lang];
}

// Aliases para conveniência
export {
  addPartSubMaterial as addSubMaterial,
  removePartSubMaterial as removeSubMaterial,
  reorderPartSubMaterials as reorderSubMaterials,
  updatePartSubMaterial as updateSubMaterial,
  setPartSubMaterialsInPart as setPartSubMaterials,
  setPartAlloyTypeInPart as setPartAlloyType,
  setPartInstancesInPart as setPartInstances,
};
