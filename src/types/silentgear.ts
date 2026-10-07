export type PartSlot = 'main' | 'rod' | 'tip' | 'coating' | 'grip' | 'lining' | 'binding';

export type MaterialCategory = 'metal' | 'gem' | 'rock' | 'wood' | 'organic' | 'cloth' | 'composite';

export type GearCategory = 'weapon' | 'tool' | 'armor' | 'ranged';

export type Grade = 'NONE' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'MAX';

export const GRADE_MULTIPLIERS: Record<Grade, number> = {
  NONE: 0.0,
  E: -0.15,
  D: -0.10,
  C: -0.05,
  B: 0.0,
  A: 0.05,
  S: 0.10,
  SS: 0.15,
  SSS: 0.20,
  MAX: 0.25,
};

export interface MaterialStats {
  durability?: number;
  armor?: number;
  armor_durability?: number;
  armor_toughness?: number;
  magic_armor?: number;
  melee_damage?: number;
  attack_speed?: number;
  harvest_speed?: number;
  harvest_tier?: string;
  ranged_damage?: number;
  ranged_speed?: number;
  rarity?: number;
  synergy?: number;
  enchantment_value?: number;
  charging_value?: number;
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
  color: string; // Hex color for layer tinting (e.g. "#33EBCB")
  harvest_tier?: string;
  stats: Partial<Record<PartSlot, MaterialStats>>;
  statModifiers?: Partial<Record<PartSlot, Record<string, StatModifier>>>;
  traits: Partial<Record<PartSlot, MaterialTraitRef[]>>;
  texture?: string;
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

export interface GearPartSelection {
  materialId: string;
  grade?: Grade;
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
}

export interface OptimizedBuildResult {
  build: GearBuild;
  stats: CalculatedGearStats;
  score: number;
  summaryHighlights: string[];
}
