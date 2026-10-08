export type PartSlot = 'main' | 'rod' | 'tip' | 'coating' | 'grip' | 'lining' | 'binding';

export type MaterialCategory = 'metal' | 'gem' | 'rock' | 'wood' | 'organic' | 'cloth' | 'composite';

export type GearCategory = 'weapon' | 'tool' | 'armor' | 'ranged';

export type Grade = 'NONE' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'MAX';

export const GRADE_MULTIPLIERS: Record<Grade, number> = {
  NONE: 0.0,
  E: 0.01,
  D: 0.02,
  C: 0.03,
  B: 0.04,
  A: 0.05,
  S: 0.10,
  SS: 0.15,
  SSS: 0.25,
  MAX: 0.30,
};

export type ArmorPiece = 'helmet' | 'chestplate' | 'leggings' | 'boots';

export type StatOperation =
  | 'AVERAGE'
  | 'MAX'
  | 'ADD'
  | 'MULTIPLY_BASE'
  | 'MULTIPLY_TOTAL'
  | 'avg'
  | 'max'
  | 'add'
  | 'mul1'
  | 'mul2';

export interface StatValueModifier {
  value: number;
  operation?: StatOperation;
}

export type StatModifierEntry = number | StatValueModifier | StatValueModifier[];

export interface MaterialStats {
  durability?: StatModifierEntry;
  armor?: StatModifierEntry;
  armor_by_piece?: Partial<Record<ArmorPiece, StatModifierEntry>>;
  armor_durability?: StatModifierEntry;
  armor_toughness?: StatModifierEntry;
  magic_armor?: StatModifierEntry;
  knockback_resistance?: StatModifierEntry;
  melee_damage?: StatModifierEntry;
  attack_speed?: StatModifierEntry;
  harvest_speed?: StatModifierEntry;
  harvest_tier?: string;
  ranged_damage?: StatModifierEntry;
  ranged_speed?: StatModifierEntry;
  rarity?: StatModifierEntry;
  synergy?: StatModifierEntry;
  enchantment_value?: StatModifierEntry;
  charging_value?: StatModifierEntry;
}

export interface StatModifier {
  add?: number;
  mul?: number;
  mul2?: number;
}

export interface MaterialTraitRef {
  name: string;
  level: number;
}

export interface Material {
  id: string;
  name: {
    en: string;
    pt: string;
  };
  tier: number;
  category: MaterialCategory;
  categories?: string[];
  color: string; // Hex color for layer tinting (e.g. "#33EBCB")
  harvest_tier?: string;
  stats: Partial<Record<PartSlot, MaterialStats>>;
  statModifiers?: Partial<Record<PartSlot, Record<string, StatModifier>>>;
  traits: Partial<Record<PartSlot, MaterialTraitRef[]>>;
  texture?: string;
  parent?: string;
}

export interface GearType {
  id: string;
  name: {
    en: string;
    pt: string;
  };
  category: GearCategory;
  requiredSlots: PartSlot[];
  optionalSlots: PartSlot[];
  baseDamage: number;
  baseAttackSpeed: number;
  durabilityMultiplier: number;
  iconName: string;
}

export interface TraitInfo {
  id: string;
  maxLevel: number;
  name: {
    en: string;
    pt: string;
  };
  description: {
    en: string;
    pt: string;
  };
}

export interface SubMaterialSelection {
  materialId: string;
  grade?: Grade;
  starcharge?: StarchargeLevel;
}

export type StarchargeLevel = 0 | 1 | 2 | 3;

export interface GearPartSelection {
  materialId: string;
  grade?: Grade;
  materials?: SubMaterialSelection[];
  starcharge?: StarchargeLevel;
}

export interface GearBuild {
  gearTypeId: string;
  parts: Partial<Record<PartSlot, GearPartSelection>>;
}

export interface CalculatedTrait {
  id: string;
  name: {
    en: string;
    pt: string;
  };
  level: number;
  maxLevel: number;
  description: {
    en: string;
    pt: string;
  };
}

export interface CalculatedGearStats {
  durability: number;
  armor: number;
  armorToughness: number;
  magicArmor: number;
  knockbackResistance?: number;
  meleeDamage: number;
  attackSpeed: number;
  dps: number;
  harvestSpeed: number;
  harvestTier: string;
  synergy: number;
  rarity: number;
  traits: CalculatedTrait[];
}

export interface VersionCatalog {
  version: string;
  sourceCommit?: string;
  materials: Record<string, Material>;
  gearTypes: Record<string, GearType>;
  traits: Record<string, TraitInfo>;
}

export interface VersionPreset {
  id: string;
  name: string;
  badge: string;
  type: 'official' | 'modpack' | 'custom';
  minecraftVersion: string;
  description: string;
}

export type OptimizationGoal =
  | 'max_damage'
  | 'max_dps'
  | 'max_durability'
  | 'max_protection'
  | 'max_harvest'
  | 'balanced';

export interface OptimizationRequest {
  gearTypeId: string;
  availableMaterials: string[];
  goal: OptimizationGoal;
  fixedSlots?: Partial<Record<PartSlot, string>>;
  grade?: Grade;
  maxGrade?: Grade;
  starcharge?: StarchargeLevel;
  allowAlloys?: boolean;
  maxAlloyIngredients?: number;
}

export interface OptimizedBuildResult {
  build: GearBuild;
  stats: CalculatedGearStats;
  score: number;
  summaryHighlights: string[];
}
