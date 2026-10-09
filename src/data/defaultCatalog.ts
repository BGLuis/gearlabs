import { Material, GearType, TraitInfo, VersionCatalog, VersionPreset } from '@/types/silentgear';

export const OFFICIAL_MATERIALS_1_20: Record<string, Material> = {
  'silentgear:iron': {
    id: 'silentgear:iron',
    name: { en: 'Iron', pt: 'Ferro' },
    tier: 2,
    category: 'metal',
    color: '#FFFFFF',
    stats: {
      main: {
        durability: 250,
        armor: 15,
        armor_durability: 15,
        armor_toughness: 0,
        magic_armor: 6,
        melee_damage: 2.0,
        attack_speed: 0.0,
        harvest_speed: 6.0,
        harvest_tier: 'minecraft:iron',
        rarity: 20,
      },
      rod: { durability: 50 },
      tip: { durability: 64, melee_damage: 1.0, harvest_speed: 1.0 },
      coating: { durability: 60, armor: 2 },
    },
    statModifiers: {
      rod: { durability: { mul2: 0.1 } },
    },
    traits: {
      main: [{ name: 'silentgear:malleable', level: 2 }],
      rod: [{ name: 'silentgear:flexible', level: 1 }],
      tip: [{ name: 'silentgear:magnetic', level: 1 }],
    },
  },
  'silentgear:diamond': {
    id: 'silentgear:diamond',
    name: { en: 'Diamond', pt: 'Diamante' },
    tier: 3,
    category: 'gem',
    color: '#33EBCB',
    stats: {
      main: {
        durability: 1561,
        armor: 20,
        armor_toughness: 8,
        magic_armor: 4,
        melee_damage: 3.0,
        attack_speed: 0.0,
        harvest_speed: 8.0,
        harvest_tier: 'minecraft:diamond',
        rarity: 70,
      },
      rod: {},
      tip: { durability: 256, melee_damage: 2.0, harvest_speed: 2.0, rarity: 20 },
    },
    statModifiers: {
      rod: { harvest_speed: { mul2: 0.2 } },
    },
    traits: {
      main: [
        { name: 'silentgear:brittle', level: 2 },
        { name: 'silentgear:lustrous', level: 1 },
      ],
      tip: [{ name: 'silentgear:brittle', level: 1 }],
    },
  },
  'silentgear:netherite': {
    id: 'silentgear:netherite',
    name: { en: 'Netherite', pt: 'Netherita' },
    tier: 4,
    category: 'metal',
    color: '#867B86',
    stats: {
      main: {
        durability: 2031,
        armor: 20,
        armor_toughness: 12,
        magic_armor: 6,
        melee_damage: 4.0,
        attack_speed: 0.0,
        harvest_speed: 9.0,
        harvest_tier: 'minecraft:netherite',
        rarity: 100,
      },
      coating: {
        armor_toughness: { operation: 'ADD', value: 4 },
        knockback_resistance: { operation: 'ADD', value: 1 },
        armor_durability: { operation: 'MULTIPLY_TOTAL', value: 0.1212 },
        durability: { operation: 'MULTIPLY_TOTAL', value: 0.3 },
        melee_damage: { operation: 'MULTIPLY_TOTAL', value: 0.3333 },
      },
      tip: { durability: 400, melee_damage: 2.5, harvest_speed: 2.5 },
    },
    statModifiers: {
      rod: { durability: { mul2: 0.3 } },
    },
    traits: {
      main: [
        { name: 'silentgear:fireproof', level: 1 },
        { name: 'silentgear:heavy', level: 1 },
      ],
      coating: [{ name: 'silentgear:fireproof', level: 1 }],
    },
  },
  'silentgear:crimson_iron': {
    id: 'silentgear:crimson_iron',
    name: { en: 'Crimson Iron', pt: 'Ferro Carmesim' },
    tier: 2,
    category: 'metal',
    color: '#FF6189',
    stats: {
      main: {
        durability: 450,
        armor: 16,
        armor_toughness: 2,
        magic_armor: 4,
        melee_damage: 2.5,
        attack_speed: 0.0,
        harvest_speed: 6.5,
        harvest_tier: 'minecraft:diamond',
        rarity: 40,
      },
      rod: { durability: 80 },
      tip: { durability: 120, melee_damage: 1.5, harvest_speed: 1.5 },
    },
    statModifiers: {
      rod: { durability: { mul2: 0.15 } },
    },
    traits: {
      main: [{ name: 'silentgear:fireproof', level: 1 }],
      rod: [{ name: 'silentgear:flexible', level: 2 }],
    },
  },
  'silentgear:crimson_steel': {
    id: 'silentgear:crimson_steel',
    name: { en: 'Crimson Steel', pt: 'Aço Carmesim' },
    tier: 3,
    category: 'metal',
    color: '#DC143C',
    stats: {
      main: {
        durability: 1650,
        armor: 22,
        armor_toughness: 9,
        magic_armor: 8,
        melee_damage: 4.5,
        attack_speed: 0.0,
        harvest_speed: 8.5,
        harvest_tier: 'minecraft:netherite',
        rarity: 80,
      },
      tip: { durability: 300, melee_damage: 2.5, harvest_speed: 2.0 },
      coating: {
        armor_toughness: { operation: 'ADD', value: 4 },
        knockback_resistance: { operation: 'ADD', value: 1 },
        armor_durability: { operation: 'MULTIPLY_TOTAL', value: 0.1212 },
        durability: { operation: 'MULTIPLY_TOTAL', value: 0.3 },
        melee_damage: { operation: 'MULTIPLY_TOTAL', value: 0.3333 },
      },
    },
    statModifiers: {
      rod: { durability: { mul2: 0.25 } },
    },
    traits: {
      main: [
        { name: 'silentgear:fireproof', level: 1 },
        { name: 'silentgear:jagged', level: 2 },
      ],
    },
  },
  'silentgear:azure_silver': {
    id: 'silentgear:azure_silver',
    name: { en: 'Azure Silver', pt: 'Prata Azul' },
    tier: 3,
    category: 'metal',
    color: '#CBBAFF',
    stats: {
      main: {
        durability: 850,
        armor: 17,
        armor_toughness: 6,
        magic_armor: 12,
        melee_damage: 3.5,
        attack_speed: 0.2,
        harvest_speed: 11.0,
        harvest_tier: 'minecraft:diamond',
        rarity: 75,
      },
      rod: { durability: 100 },
    },
    statModifiers: {
      rod: {
        attack_speed: { add: 0.15 },
        harvest_speed: { mul2: 0.2 },
      },
    },
    traits: {
      main: [{ name: 'silentgear:holy', level: 2 }],
      rod: [{ name: 'silentgear:light', level: 1 }],
    },
  },
  'silentgear:azure_electrum': {
    id: 'silentgear:azure_electrum',
    name: { en: 'Azure Electrum', pt: 'Electrum Azul' },
    tier: 4,
    category: 'metal',
    color: '#4575E3',
    stats: {
      main: {
        durability: 1850,
        armor: 20,
        armor_toughness: 10,
        magic_armor: 16,
        melee_damage: 4.0,
        attack_speed: 0.3,
        harvest_speed: 13.0,
        harvest_tier: 'minecraft:netherite',
        rarity: 95,
      },
    },
    statModifiers: {
      rod: { attack_speed: { add: 0.25 } },
    },
    traits: {
      main: [
        { name: 'silentgear:swift', level: 2 },
        { name: 'silentgear:holy', level: 3 },
      ],
    },
  },
  'silentgear:gold': {
    id: 'silentgear:gold',
    name: { en: 'Gold', pt: 'Ouro' },
    tier: 1,
    category: 'metal',
    color: '#FDFF70',
    stats: {
      main: {
        durability: 32,
        armor: 11,
        armor_toughness: 0,
        magic_armor: 10,
        melee_damage: 1.0,
        attack_speed: 0.4,
        harvest_speed: 12.0,
        harvest_tier: 'minecraft:wood',
        rarity: 30,
      },
      tip: { harvest_speed: 4.0 },
    },
    statModifiers: {
      rod: { attack_speed: { add: 0.2 } },
    },
    traits: {
      main: [
        { name: 'silentgear:soft', level: 2 },
        { name: 'silentgear:lustrous', level: 3 },
      ],
    },
  },
  'silentgear:copper': {
    id: 'silentgear:copper',
    name: { en: 'Copper', pt: 'Cobre' },
    tier: 1,
    category: 'metal',
    color: '#FD804C',
    stats: {
      main: {
        durability: 180,
        armor: 12,
        armor_toughness: 0,
        magic_armor: 2,
        melee_damage: 1.5,
        attack_speed: 0.0,
        harvest_speed: 5.0,
        harvest_tier: 'minecraft:stone',
        rarity: 15,
      },
      rod: { durability: 30 },
    },
    statModifiers: {
      rod: { durability: { mul2: 0.05 } },
    },
    traits: {
      main: [{ name: 'silentgear:malleable', level: 1 }],
      rod: [{ name: 'silentgear:conductive', level: 2 }],
    },
  },
  'silentgear:wood': {
    id: 'silentgear:wood',
    name: { en: 'Wood', pt: 'Madeira' },
    tier: 0,
    category: 'wood',
    color: '#896727',
    stats: {
      main: {
        durability: 59,
        armor: 4,
        armor_toughness: 0,
        magic_armor: 0,
        melee_damage: 1.0,
        attack_speed: 0.0,
        harvest_speed: 2.0,
        harvest_tier: 'minecraft:wood',
        rarity: 5,
      },
      rod: { durability: 15 },
    },
    statModifiers: {
      rod: { durability: { mul2: 0.0 } },
    },
    traits: {
      main: [{ name: 'silentgear:flexible', level: 1 }],
      rod: [{ name: 'silentgear:flexible', level: 1 }],
    },
  },
  'silentgear:wool': {
    id: 'silentgear:wool',
    name: { en: 'Wool', pt: 'Lã' },
    tier: 1,
    category: 'organic',
    categories: ['organic', 'cloth', 'basic'],
    color: '#FFFFFF',
    stats: {
      main: {
        durability: 0,
        armor: 4,
        armor_durability: 4,
        magic_armor: 4,
        rarity: 7,
        enchantment_value: 7,
        charging_value: 0.7,
      },
      lining: {
        knockback_resistance: { value: 0.1, operation: 'ADD' },
      },
      grip: {
        attack_speed: { value: 0.2, operation: 'ADD' },
      },
    },
    traits: {
      main: [{ name: 'silentgear:snow_walker', level: 1 }],
      lining: [{ name: 'silentgear:flexible', level: 2 }],
      grip: [{ name: 'silentgear:flexible', level: 2 }],
    },
  },
};

// Novos materiais oficiais do Minecraft 1.21+ / Tricky Trials e ATM11
export const BREEZE_ROD_MATERIAL: Material = {
  id: 'silentgear:breeze_rod',
  name: { en: 'Breeze Rod', pt: 'Haste de Brisa' },
  tier: 2,
  category: 'metal',
  color: '#9398C1',
  stats: {
    rod: {
      durability: 150,
      attack_speed: 0.35,
    },
  },
  statModifiers: {
    rod: {
      attack_speed: { add: 0.35 },
    },
  },
  traits: {
    rod: [{ name: 'silentgear:swift', level: 2 }],
  },
};

// Materiais Lendários do All The Mods 11 / ATM10 / ATM9
export const ALLTHEMODIUM_MATERIALS: Record<string, Material> = {
  'silentgear:allthemodium': {
    id: 'silentgear:allthemodium',
    name: { en: 'Allthemodium', pt: 'Allthemodium' },
    tier: 2,
    category: 'metal',
    categories: ['metal', 'endgame'],
    color: '#FFEF0E',
    stats: {
      main: {
        durability: 5500,
        armor: 60,
        armor_durability: 60,
        armor_toughness: 60,
        magic_armor: 200,
        melee_damage: 22,
        attack_speed: 8.2,
        harvest_speed: 8,
        ranged_damage: 0,
        rarity: 90,
        enchantment_value: 85,
        harvest_tier: 'allthemodium',
        by_type: {
          armor: {
            helmet: 15,
            chestplate: 15,
            leggings: 15,
            boots: 15,
          },
        },
      },
      rod: {
        durability: { value: 1.5, operation: 'MULTIPLY_TOTAL' },
        rarity: 70,
        enchantment_value: { value: 3, operation: 'ADD' },
      },
      tip: {
        durability: { value: 16, operation: 'ADD' },
        armor_durability: { value: 10, operation: 'ADD' },
        harvest_speed: { value: 6, operation: 'ADD' },
        rarity: { value: 30, operation: 'ADD' },
        harvest_tier: 'allthemodium',
      },
    },
    traits: {
      main: [
        { name: 'silentgear:malleable', level: 4 },
        { name: 'silentgear:crushing', level: 4 },
        { name: 'silentgear:brilliant', level: 1 },
        { name: 'silentgear:advanced_aquatic', level: 1 },
        { name: 'silentgear:advanced_flame_ward', level: 1 },
      ],
      rod: [{ name: 'silentgear:hard', level: 5 }],
      tip: [
        { name: 'silentgear:malleable', level: 4 },
        { name: 'silentgear:soft', level: 3 },
      ],
    },
  },
  'silentgear:vibranium': {
    id: 'silentgear:vibranium',
    name: { en: 'Vibranium', pt: 'Vibranium' },
    tier: 2,
    category: 'metal',
    categories: ['metal', 'endgame'],
    color: '#26DE88',
    stats: {
      main: {
        durability: 7500,
        armor: 70,
        armor_durability: 90,
        armor_toughness: 70,
        magic_armor: 400,
        melee_damage: 27,
        attack_speed: 12.2,
        harvest_speed: 9,
        ranged_damage: 0,
        rarity: 90,
        enchantment_value: 105,
        harvest_tier: 'vibranium',
        by_type: {
          armor: {
            helmet: 15,
            chestplate: 20,
            leggings: 20,
            boots: 15,
          },
        },
      },
      rod: {
        durability: { value: 2.5, operation: 'MULTIPLY_TOTAL' },
        rarity: 99,
        enchantment_value: { value: 23, operation: 'ADD' },
      },
      tip: {
        durability: { value: 16, operation: 'ADD' },
        armor_durability: { value: 10, operation: 'ADD' },
        harvest_speed: { value: 6, operation: 'ADD' },
        rarity: { value: 60, operation: 'ADD' },
        harvest_tier: 'vibranium',
      },
    },
    traits: {
      main: [
        { name: 'silentgear:malleable', level: 5 },
        { name: 'silentgear:crushing', level: 5 },
        { name: 'silentgear:advanced_aquatic', level: 1 },
        { name: 'silentgear:brilliant', level: 1 },
        { name: 'silentgear:advanced_flame_ward', level: 1 },
        { name: 'silentgear:cure_wither', level: 1 },
        { name: 'silentgear:cure_nausea', level: 1 },
      ],
      rod: [{ name: 'silentgear:hard', level: 6 }],
      tip: [
        { name: 'silentgear:malleable', level: 5 },
        { name: 'silentgear:hard', level: 5 },
      ],
    },
  },
  'silentgear:unobtainium': {
    id: 'silentgear:unobtainium',
    name: { en: 'Unobtainium', pt: 'Unobtainium' },
    tier: 2,
    category: 'metal',
    categories: ['metal', 'endgame'],
    color: '#D152E3',
    stats: {
      main: {
        durability: 9500,
        armor: 90,
        armor_durability: 120,
        armor_toughness: 90,
        magic_armor: 600,
        melee_damage: 35,
        attack_speed: 18.2,
        harvest_speed: 18,
        ranged_damage: 0,
        rarity: 99,
        enchantment_value: 175,
        harvest_tier: 'unobtainium',
        by_type: {
          armor: {
            helmet: 20,
            chestplate: 25,
            leggings: 25,
            boots: 20,
          },
        },
      },
      rod: {
        durability: { value: 1.5, operation: 'MULTIPLY_TOTAL' },
        rarity: 90,
        enchantment_value: { value: 13, operation: 'ADD' },
      },
      tip: {
        durability: { value: 16, operation: 'ADD' },
        armor_durability: { value: 10, operation: 'ADD' },
        harvest_speed: { value: 6, operation: 'ADD' },
        rarity: { value: 60, operation: 'ADD' },
        harvest_tier: 'unobtainium',
      },
    },
    traits: {
      main: [
        { name: 'silentgear:malleable', level: 5 },
        { name: 'silentgear:crushing', level: 5 },
        { name: 'silentgear:advanced_aquatic', level: 1 },
        { name: 'silentgear:brilliant', level: 1 },
        { name: 'silentgear:advanced_flame_ward', level: 1 },
        { name: 'silentgear:cure_wither', level: 1 },
        { name: 'silentgear:cure_nausea', level: 1 },
        { name: 'silentgear:cure_levitation', level: 1 },
      ],
      rod: [{ name: 'silentgear:hard', level: 7 }],
      tip: [
        { name: 'silentgear:malleable', level: 5 },
        { name: 'silentgear:hard', level: 5 },
      ],
    },
  },
  'sgearmetalworks:uru_metal': {
    id: 'sgearmetalworks:uru_metal',
    name: { en: 'Uru Metal', pt: 'Metal Uru' },
    tier: 2,
    category: 'metal',
    categories: ['metal', 'endgame', 'casting', 'infusing'],
    color: '#0B2037',
    stats: {
      main: {
        durability: 15000,
        armor: 42,
        armor_durability: 50000,
        armor_toughness: 100,
        magic_armor: 600,
        melee_damage: 35,
        attack_speed: 18,
        harvest_speed: 29,
        ranged_damage: 8,
        rarity: 200,
        enchantment_value: 1500,
        charging_value: 1.5,
        harvest_tier: 'unobtainium',
        by_type: {
          armor: {
            helmet: 8,
            chestplate: 14,
            leggings: 12,
            boots: 8,
          },
        },
      },
      rod: {
        durability: { value: 3.5, operation: 'MULTIPLY_TOTAL' },
        rarity: { value: 99, operation: 'MULTIPLY_TOTAL' },
        enchantment_value: { value: 23, operation: 'ADD' },
      },
      tip: {
        durability: { value: 16, operation: 'ADD' },
        armor_durability: { value: 1, operation: 'ADD' },
        harvest_speed: { value: 6, operation: 'ADD' },
        rarity: { value: 60, operation: 'MULTIPLY_TOTAL' },
      },
    },
    traits: {
      main: [
        { name: 'silentgear:malleable', level: 6 },
        { name: 'silentgear:indestructible', level: 1 },
        { name: 'silentgear:aquatic', level: 1 },
        { name: 'silentgear:brilliant', level: 1 },
        { name: 'silentgear:flame_ward', level: 1 },
        { name: 'silentgear:cure_wither', level: 1 },
        { name: 'silentgear:cure_poison', level: 1 },
        { name: 'silentgear:sting_resist', level: 1 },
      ],
      rod: [{ name: 'silentgear:hard', level: 5 }],
      tip: [
        { name: 'silentgear:malleable', level: 5 },
        { name: 'silentgear:hard', level: 5 },
      ],
    },
  },
  'silentgear:tyrian_steel': {
    id: 'silentgear:tyrian_steel',
    name: { en: 'Tyrian Steel', pt: 'Aço Tiriano' },
    tier: 2,
    category: 'metal',
    categories: ['metal', 'endgame', 'casting'],
    color: '#B01080',
    stats: {
      main: {
        durability: 3652,
        armor: 25,
        armor_durability: 81,
        armor_toughness: 12,
        magic_armor: 12,
        melee_damage: 8,
        attack_speed: 0,
        harvest_speed: 18,
        ranged_damage: 4,
        rarity: 100,
        enchantment_value: 16,
        charging_value: 1.1,
        harvest_tier: 'tyrian_steel',
        by_type: {
          armor: {
            helmet: 5,
            chestplate: 9,
            leggings: 7,
            boots: 4,
          },
        },
      },
      rod: {
        harvest_speed: { value: -2, operation: 'ADD' },
      },
      tip: {
        durability: { value: 251, operation: 'ADD' },
        rarity: { value: 30, operation: 'ADD' },
        harvest_tier: 'tyrian_steel',
      },
    },
    traits: {
      main: [
        { name: 'silentgear:sturdy', level: 3 },
        { name: 'silentgear:void_ward', level: 1 },
      ],
      rod: [{ name: 'silentgear:sturdy', level: 4 }],
      tip: [
        { name: 'silentgear:imperial', level: 3 },
        { name: 'silentgear:gold_digger', level: 3 },
      ],
    },
  },
};

// Catálogo consolidado do Silent Gear 1.21.1 Oficial
export const OFFICIAL_MATERIALS_1_21: Record<string, Material> = {
  ...OFFICIAL_MATERIALS_1_20,
  'silentgear:breeze_rod': BREEZE_ROD_MATERIAL,
};

export const OFFICIAL_GEAR_TYPES: Record<string, GearType> = {
  sword: {
    id: 'sword',
    name: { en: 'Sword', pt: 'Espada' },
    category: 'weapon',
    requiredSlots: ['main', 'rod'],
    optionalSlots: ['tip', 'grip', 'coating', 'binding'],
    baseDamage: 3.0,
    baseAttackSpeed: 1.6,
    durabilityMultiplier: 1.0,
    iconName: 'sword',
  },
  katana: {
    id: 'katana',
    name: { en: 'Katana', pt: 'Katana' },
    category: 'weapon',
    requiredSlots: ['main', 'rod'],
    optionalSlots: ['tip', 'grip', 'coating', 'binding'],
    baseDamage: 4.0,
    baseAttackSpeed: 1.4,
    durabilityMultiplier: 1.125,
    iconName: 'katana',
  },
  pickaxe: {
    id: 'pickaxe',
    name: { en: 'Pickaxe', pt: 'Picareta' },
    category: 'tool',
    requiredSlots: ['main', 'rod'],
    optionalSlots: ['tip', 'grip', 'coating', 'binding'],
    baseDamage: 1.0,
    baseAttackSpeed: 1.2,
    durabilityMultiplier: 1.0,
    iconName: 'pickaxe',
  },
  axe: {
    id: 'axe',
    name: { en: 'Axe', pt: 'Machado' },
    category: 'tool',
    requiredSlots: ['main', 'rod'],
    optionalSlots: ['tip', 'grip', 'coating', 'binding'],
    baseDamage: 5.0,
    baseAttackSpeed: 1.0,
    durabilityMultiplier: 1.0,
    iconName: 'axe',
  },
  helmet: {
    id: 'helmet',
    name: { en: 'Helmet', pt: 'Capacete' },
    category: 'armor',
    requiredSlots: ['main'],
    optionalSlots: ['tip', 'lining', 'coating', 'binding'],
    baseDamage: 0.0,
    baseAttackSpeed: 0.0,
    durabilityMultiplier: 11,
    iconName: 'helmet',
  },
  chestplate: {
    id: 'chestplate',
    name: { en: 'Chestplate', pt: 'Peitoral' },
    category: 'armor',
    requiredSlots: ['main'],
    optionalSlots: ['tip', 'lining', 'coating', 'binding'],
    baseDamage: 0.0,
    baseAttackSpeed: 0.0,
    durabilityMultiplier: 16,
    iconName: 'chestplate',
  },
  leggings: {
    id: 'leggings',
    name: { en: 'Leggings', pt: 'Calça' },
    category: 'armor',
    requiredSlots: ['main'],
    optionalSlots: ['tip', 'lining', 'coating', 'binding'],
    baseDamage: 0.0,
    baseAttackSpeed: 0.0,
    durabilityMultiplier: 15,
    iconName: 'leggings',
  },
  boots: {
    id: 'boots',
    name: { en: 'Boots', pt: 'Botas' },
    category: 'armor',
    requiredSlots: ['main'],
    optionalSlots: ['tip', 'lining', 'coating', 'binding'],
    baseDamage: 0.0,
    baseAttackSpeed: 0.0,
    durabilityMultiplier: 13,
    iconName: 'boots',
  },
};

export const OFFICIAL_TRAITS: Record<string, TraitInfo> = {
  'silentgear:brittle': {
    id: 'silentgear:brittle',
    maxLevel: 5,
    name: { en: 'Brittle', pt: 'Frágil' },
    description: {
      en: 'Increases durability loss on high-impact attacks.',
      pt: 'Aumenta a perda de durabilidade em impactos intensos.',
    },
  },
  'silentgear:lustrous': {
    id: 'silentgear:lustrous',
    maxLevel: 5,
    name: { en: 'Lustrous', pt: 'Lustroso' },
    description: {
      en: 'Gives small chance to drop extra experience or double drops.',
      pt: 'Dá pequena chance de coletar experiência extra ou dobrar itens.',
    },
  },
  'silentgear:fireproof': {
    id: 'silentgear:fireproof',
    maxLevel: 1,
    name: { en: 'Fireproof', pt: 'À Prova de Fogo' },
    description: {
      en: 'Item will float on lava and cannot burn in fire.',
      pt: 'O item flutua na lava e não queima no fogo.',
    },
  },
  'silentgear:malleable': {
    id: 'silentgear:malleable',
    maxLevel: 5,
    name: { en: 'Malleable', pt: 'Maleável' },
    description: {
      en: 'Cheaper to repair in the crafting station and anvil.',
      pt: 'Mais barato para reparar na estação de criação e bigorna.',
    },
  },
  'silentgear:flexible': {
    id: 'silentgear:flexible',
    maxLevel: 5,
    name: { en: 'Flexible', pt: 'Flexível' },
    description: {
      en: 'Reduces damage taken by the tool or armor from explosions.',
      pt: 'Reduz o dano sofrido pelo equipamento contra explosões.',
    },
  },
  'silentgear:jagged': {
    id: 'silentgear:jagged',
    maxLevel: 5,
    name: { en: 'Jagged', pt: 'Serrilhado' },
    description: {
      en: 'Causes extra bleeding damage over time on hit.',
      pt: 'Causa dano adicional de sangramento contínuo ao golpear.',
    },
  },
  'silentgear:swift': {
    id: 'silentgear:swift',
    maxLevel: 5,
    name: { en: 'Swift', pt: 'Veloz' },
    description: {
      en: 'Increases attack speed and movement speed.',
      pt: 'Aumenta a velocidade de ataque e a agilidade de movimento.',
    },
  },
  'silentgear:holy': {
    id: 'silentgear:holy',
    maxLevel: 5,
    name: { en: 'Holy', pt: 'Sagrado' },
    description: {
      en: 'Deals massive bonus damage against undead monsters.',
      pt: 'Causa dano bônus maciço contra monstros mortos-vivos.',
    },
  },
  'silentgear:magnetic': {
    id: 'silentgear:magnetic',
    maxLevel: 3,
    name: { en: 'Magnetic', pt: 'Magnético' },
    description: {
      en: 'Pulls nearby dropped items toward the player.',
      pt: 'Atrai itens caídos no chão diretamente para o jogador.',
    },
  },
  'silentgear:indestructible': {
    id: 'silentgear:indestructible',
    maxLevel: 1,
    name: { en: 'Indestructible', pt: 'Indestrutível' },
    description: {
      en: 'Item does not take durability damage and is immune to void damage.',
      pt: 'O item não sofre dano de durabilidade e é imune ao dano do vazio.',
    },
  },
  'silentgear:crushing': {
    id: 'silentgear:crushing',
    maxLevel: 5,
    name: { en: 'Crushing', pt: 'Esmagador' },
    description: {
      en: 'Increases armor bypass or impact damage.',
      pt: 'Aumenta a perfuração de armadura ou o impacto do golpe.',
    },
  },
  'silentgear:brilliant': {
    id: 'silentgear:brilliant',
    maxLevel: 1,
    name: { en: 'Brilliant', pt: 'Brilhante' },
    description: {
      en: 'Increases experience gained.',
      pt: 'Aumenta a experiência obtida ao usar a ferramenta ou arma.',
    },
  },
  'silentgear:sturdy': {
    id: 'silentgear:sturdy',
    maxLevel: 5,
    name: { en: 'Sturdy', pt: 'Robusto' },
    description: {
      en: 'Increases durability and armor toughness.',
      pt: 'Aumenta a durabilidade e a tenacidade da armadura.',
    },
  },
  'silentgear:void_ward': {
    id: 'silentgear:void_ward',
    maxLevel: 1,
    name: { en: 'Void Ward', pt: 'Proteção do Vazio' },
    description: {
      en: 'Protects the holder from falling into the void.',
      pt: 'Protege o portador de quedas no vazio.',
    },
  },
  'silentgear:aquatic': {
    id: 'silentgear:aquatic',
    maxLevel: 1,
    name: { en: 'Aquatic', pt: 'Aquático' },
    description: {
      en: 'Improves underwater efficiency and mobility.',
      pt: 'Melhora a eficiência e mobilidade debaixo d’água.',
    },
  },
  'silentgear:advanced_aquatic': {
    id: 'silentgear:advanced_aquatic',
    maxLevel: 1,
    name: { en: 'Advanced Aquatic', pt: 'Aquático Avançado' },
    description: {
      en: 'Grants superior underwater breathing and mobility.',
      pt: 'Concede respiração aquática superior e extrema mobilidade na água.',
    },
  },
  'silentgear:flame_ward': {
    id: 'silentgear:flame_ward',
    maxLevel: 1,
    name: { en: 'Flame Ward', pt: 'Proteção de Chamas' },
    description: {
      en: 'Protects against burning and fire damage.',
      pt: 'Protege contra queimaduras e dano por fogo.',
    },
  },
  'silentgear:advanced_flame_ward': {
    id: 'silentgear:advanced_flame_ward',
    maxLevel: 1,
    name: { en: 'Advanced Flame Ward', pt: 'Proteção de Chamas Avançada' },
    description: {
      en: 'Complete immunity to fire, lava, and burning.',
      pt: 'Imunidade completa a fogo, lava e queimaduras.',
    },
  },
  'silentgear:cure_wither': {
    id: 'silentgear:cure_wither',
    maxLevel: 1,
    name: { en: 'Cure Wither', pt: 'Cura Decomposição' },
    description: {
      en: 'Neutralizes the wither effect.',
      pt: 'Neutraliza o efeito de decomposição (wither).',
    },
  },
  'silentgear:cure_nausea': {
    id: 'silentgear:cure_nausea',
    maxLevel: 1,
    name: { en: 'Cure Nausea', pt: 'Cura Náusea' },
    description: {
      en: 'Neutralizes nausea and dizziness effects.',
      pt: 'Neutraliza náusea e tontura.',
    },
  },
  'silentgear:cure_poison': {
    id: 'silentgear:cure_poison',
    maxLevel: 1,
    name: { en: 'Cure Poison', pt: 'Cura Veneno' },
    description: {
      en: 'Neutralizes poison effects.',
      pt: 'Neutraliza efeitos de veneno.',
    },
  },
  'silentgear:cure_levitation': {
    id: 'silentgear:cure_levitation',
    maxLevel: 1,
    name: { en: 'Cure Levitation', pt: 'Cura Levitação' },
    description: {
      en: 'Neutralizes levitation effect.',
      pt: 'Neutraliza o efeito de levitação.',
    },
  },
  'silentgear:sting_resist': {
    id: 'silentgear:sting_resist',
    maxLevel: 1,
    name: { en: 'Sting Resist', pt: 'Resistência a Ferroadas' },
    description: {
      en: 'Reduces damage and sting effects from arthropods.',
      pt: 'Reduz o dano e ferrões de artrópodes.',
    },
  },
  'silentgear:hard': {
    id: 'silentgear:hard',
    maxLevel: 10,
    name: { en: 'Hard', pt: 'Duro' },
    description: {
      en: 'Increases durability and armor.',
      pt: 'Aumenta a durabilidade e o valor de armadura.',
    },
  },
  'silentgear:soft': {
    id: 'silentgear:soft',
    maxLevel: 5,
    name: { en: 'Soft', pt: 'Macio' },
    description: {
      en: 'Decreases durability slightly but increases flexibility.',
      pt: 'Reduz levemente a durabilidade mas aumenta a flexibilidade.',
    },
  },
  'silentgear:imperial': {
    id: 'silentgear:imperial',
    maxLevel: 5,
    name: { en: 'Imperial', pt: 'Imperial' },
    description: {
      en: 'Increases luck and treasure yield.',
      pt: 'Aumenta a sorte e a obtenção de tesouros.',
    },
  },
  'silentgear:gold_digger': {
    id: 'silentgear:gold_digger',
    maxLevel: 5,
    name: { en: 'Gold Digger', pt: 'Garimpeiro' },
    description: {
      en: 'Increases gold drops from mining.',
      pt: 'Aumenta a chance de extrair ouro ao minerar.',
    },
  },
  'silentgear:synergistic': {
    id: 'silentgear:synergistic',
    maxLevel: 5,
    name: { en: 'Synergistic', pt: 'Sinergético' },
    description: {
      en: 'Gear gets a synergy bonus (if base value is more than 100%).',
      pt: 'Concede bônus de sinergia caso o valor base seja superior a 100%.',
    },
  },
  'silentgear:rustic': {
    id: 'silentgear:rustic',
    maxLevel: 5,
    name: { en: 'Rustic', pt: 'Rústico' },
    description: {
      en: "Increases synergy if it's 100% or less.",
      pt: 'Aumenta a sinergia caso o valor base seja de 100% ou menos.',
    },
  },
  'silentgear:crude': {
    id: 'silentgear:crude',
    maxLevel: 5,
    name: { en: 'Crude', pt: 'Bruto' },
    description: {
      en: 'Reduces synergy.',
      pt: 'Reduz a sinergia.',
    },
  },
};

export const VERSION_PRESETS: VersionPreset[] = [
  {
    id: 'atm11',
    name: 'All The Mods 11 (ATM11)',
    badge: 'Mais Recente',
    type: 'modpack',
    minecraftVersion: '26.1.x / 1.21+',
    description: 'Modpack mais recente com Allthemodium, Vibranium, Unobtainium e Breeze Rod.',
  },
  {
    id: 'atm10',
    name: 'All The Mods 10 (ATM10)',
    badge: '1.21.1',
    type: 'modpack',
    minecraftVersion: '1.21.1',
    description: 'Modpack completo para Minecraft 1.21.1 NeoForge.',
  },
  {
    id: 'atm9',
    name: 'All The Mods 9 (ATM9)',
    badge: '1.20.1',
    type: 'modpack',
    minecraftVersion: '1.20.1',
    description: 'Versão consagrada para 1.20.1 com centenas de mods.',
  },
  {
    id: '1.21.1',
    name: 'Minecraft 1.21.1 (Oficial)',
    badge: 'SG 4.2.3',
    type: 'official',
    minecraftVersion: '1.21.1',
    description: 'Silent Gear oficial 4.2.3 com Breeze Rod e Tricky Trials.',
  },
  {
    id: '1.20.1',
    name: 'Minecraft 1.20.1 (Oficial)',
    badge: 'SG 3.6.x',
    type: 'official',
    minecraftVersion: '1.20.1',
    description: 'Silent Gear oficial para Minecraft 1.20.1.',
  },
  {
    id: '1.19.2',
    name: 'Minecraft 1.19.2 (Oficial)',
    badge: 'SG 3.2.x',
    type: 'official',
    minecraftVersion: '1.19.2',
    description: 'Silent Gear oficial para Minecraft 1.19.2.',
  },
];

export const ATM11_CATALOG: VersionCatalog = {
  version: 'atm11',
  materials: {
    ...OFFICIAL_MATERIALS_1_20,
    'silentgear:breeze_rod': BREEZE_ROD_MATERIAL,
    ...ALLTHEMODIUM_MATERIALS,
  },
  gearTypes: OFFICIAL_GEAR_TYPES,
  traits: OFFICIAL_TRAITS,
};

