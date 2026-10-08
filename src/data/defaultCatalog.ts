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
        armor_toughness: 0,
        magic_armor: 0,
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
      coating: { durability: 300, armor: 4, melee_damage: 1.5 },
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
      coating: { durability: 250, armor: 3 },
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
  'allthemodium:allthemodium': {
    id: 'allthemodium:allthemodium',
    name: { en: 'Allthemodium', pt: 'Allthemodium' },
    tier: 5,
    category: 'metal',
    color: '#FFEF0E',
    stats: {
      main: {
        durability: 12000,
        armor: 25,
        armor_toughness: 12,
        magic_armor: 8,
        melee_damage: 7.0,
        harvest_speed: 14.0,
        harvest_tier: 'allthemodium:allthemodium',
        rarity: 150,
      },
      rod: { durability: 1000 },
      tip: { durability: 2000, melee_damage: 3.0, harvest_speed: 4.0 },
      coating: { durability: 1500, armor: 4, melee_damage: 2.0 },
    },
    statModifiers: {
      rod: { durability: { mul2: 0.4 }, attack_speed: { add: 0.1 } },
    },
    traits: {
      main: [
        { name: 'allthemodium:indestructible', level: 1 },
        { name: 'silentgear:fireproof', level: 1 },
        { name: 'silentgear:malleable', level: 3 },
      ],
      tip: [{ name: 'silentgear:lustrous', level: 2 }],
    },
  },
  'allthemodium:vibranium': {
    id: 'allthemodium:vibranium',
    name: { en: 'Vibranium', pt: 'Vibranium' },
    tier: 6,
    category: 'metal',
    color: '#26DE88',
    stats: {
      main: {
        durability: 28000,
        armor: 30,
        armor_toughness: 16,
        magic_armor: 14,
        melee_damage: 11.0,
        attack_speed: 0.2,
        harvest_speed: 20.0,
        harvest_tier: 'allthemodium:vibranium',
        rarity: 220,
      },
      rod: { durability: 2500 },
      tip: { durability: 5000, melee_damage: 5.0, harvest_speed: 6.0 },
      coating: { durability: 3500, armor: 6, melee_damage: 3.5 },
    },
    statModifiers: {
      rod: { durability: { mul2: 0.6 }, attack_speed: { add: 0.2 } },
    },
    traits: {
      main: [
        { name: 'allthemodium:vibranium_shield', level: 1 },
        { name: 'silentgear:swift', level: 3 },
        { name: 'silentgear:fireproof', level: 1 },
      ],
      tip: [{ name: 'silentgear:jagged', level: 3 }],
    },
  },
  'allthemodium:unobtainium': {
    id: 'allthemodium:unobtainium',
    name: { en: 'Unobtainium', pt: 'Unobtainium' },
    tier: 7,
    category: 'metal',
    color: '#D152E3',
    stats: {
      main: {
        durability: 52000,
        armor: 35,
        armor_toughness: 20,
        magic_armor: 20,
        melee_damage: 16.0,
        attack_speed: 0.3,
        harvest_speed: 26.0,
        harvest_tier: 'allthemodium:unobtainium',
        rarity: 300,
      },
      rod: { durability: 5000 },
      tip: { durability: 10000, melee_damage: 8.0, harvest_speed: 8.0 },
      coating: { durability: 8000, armor: 8, melee_damage: 5.0 },
    },
    statModifiers: {
      rod: { durability: { mul2: 1.0 }, attack_speed: { add: 0.3 } },
    },
    traits: {
      main: [
        { name: 'allthemodium:godlike', level: 1 },
        { name: 'silentgear:holy', level: 5 },
        { name: 'silentgear:fireproof', level: 1 },
      ],
      tip: [{ name: 'silentgear:holy', level: 3 }, { name: 'silentgear:jagged', level: 4 }],
    },
  },
};

// Catálogo consolidado do All The Mods 11 (ATM11 - NeoForge 26.1.x)
export const ATM11_MATERIALS: Record<string, Material> = {
  ...OFFICIAL_MATERIALS_1_20,
  'silentgear:breeze_rod': BREEZE_ROD_MATERIAL,
  ...ALLTHEMODIUM_MATERIALS,
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
    optionalSlots: ['tip', 'grip', 'coating'],
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
    optionalSlots: ['tip', 'grip', 'coating'],
    baseDamage: 3.5,
    baseAttackSpeed: 1.7,
    durabilityMultiplier: 1.1,
    iconName: 'katana',
  },
  pickaxe: {
    id: 'pickaxe',
    name: { en: 'Pickaxe', pt: 'Picareta' },
    category: 'tool',
    requiredSlots: ['main', 'rod'],
    optionalSlots: ['tip', 'grip', 'binding'],
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
    optionalSlots: ['tip', 'grip', 'binding'],
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
    optionalSlots: ['lining', 'coating'],
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
    optionalSlots: ['lining', 'coating'],
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
    optionalSlots: ['lining', 'coating'],
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
    optionalSlots: ['lining', 'coating'],
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
  'allthemodium:indestructible': {
    id: 'allthemodium:indestructible',
    maxLevel: 1,
    name: { en: 'Indestructible', pt: 'Indestrutível' },
    description: {
      en: 'Immune to all durability damage, explosions, and void damage.',
      pt: 'Imune a dano de durabilidade, explosões e dano do vazio.',
    },
  },
  'allthemodium:vibranium_shield': {
    id: 'allthemodium:vibranium_shield',
    maxLevel: 1,
    name: { en: 'Vibranium Kinetic Shield', pt: 'Escudo Cinético de Vibranium' },
    description: {
      en: 'Absorbs kinetic impact and grants extreme regeneration.',
      pt: 'Absorve impactos cinéticos e concede regeneração acelerada.',
    },
  },
  'allthemodium:godlike': {
    id: 'allthemodium:godlike',
    maxLevel: 1,
    name: { en: 'Godlike Transcendence', pt: 'Transcendência Divina' },
    description: {
      en: 'Ultimate power tier: massive resistance and cosmic damage amplification.',
      pt: 'Poder supremo: resistência absoluta e amplificação cósmica de dano.',
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
  materials: ATM11_MATERIALS,
  gearTypes: OFFICIAL_GEAR_TYPES,
  traits: OFFICIAL_TRAITS,
};
