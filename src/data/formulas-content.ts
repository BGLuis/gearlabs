import exampleCatalogJson from './formulas-example-catalog.json';
import {
  GRADE_MULTIPLIERS,
  GearBuild,
  Grade,
  VersionCatalog,
} from '@/types/silentgear';
import {
  ATTACK_SPEED_LIMITS,
  CRUDE_PROPERTY_MULTIPLIER,
  STARCHARGE_CONSTANTS,
  STATS_AFFECTED_BY_SYNERGY,
  SYNERGY_CONSTANTS,
  applyGradeBonus,
  applyStarcharge,
  applySynergyBonus,
  calculateGearStats,
  composeCompoundSlotModifiers,
  compressModifiersForProperty,
  extractModifiers,
  resolveTypedStat,
} from '@/lib/calculator';
import { ALLOY_CONFIGS } from '@/lib/parts';

export type Localized = { pt: string; en: string };

/** Commit do Silent Gear 4.2.3 em que cada afirmação desta página foi lida. */
export const SILENT_GEAR_COMMIT = 'cb9926f4a3215a2f6016e4b465d1029ce06251e4';
const SILENT_GEAR_BLOB_URL = `https://github.com/SilentChaos512/Silent-Gear/blob/${SILENT_GEAR_COMMIT}`;
const SG = 'src/main/java/net/silentchaos512/gear/';

export interface SourceRef {
  file: string;
  startLine: number;
  endLine?: number;
}

export function sourceUrl(ref: SourceRef): string {
  const anchor = ref.endLine && ref.endLine !== ref.startLine ? `L${ref.startLine}-L${ref.endLine}` : `L${ref.startLine}`;
  return `${SILENT_GEAR_BLOB_URL}/${ref.file}#${anchor}`;
}

export function sourceLabel(ref: SourceRef): string {
  const name = ref.file.slice(ref.file.lastIndexOf('/') + 1);
  const lines = ref.endLine && ref.endLine !== ref.startLine ? `${ref.startLine}-${ref.endLine}` : `${ref.startLine}`;
  return `${name}:${lines}`;
}

const src = (file: string, startLine: number, endLine?: number): SourceRef => ({ file: SG + file, startLine, endLine });

export interface FormulaSection {
  id: string;
  title: Localized;
  text: Localized;
  /** Uma linha por fórmula; renderizadas em `<code>`. */
  formula: string[];
  source: SourceRef[];
  /** Lido no código do mod, não observado no jogo. */
  unobserved?: boolean;
}

export const PIPELINE_PHASES = [
  { id: 'material-properties', label: { pt: 'Propriedades do material por parte', en: 'Material properties per part' } },
  { id: 'material-modifiers', label: { pt: 'Modificadores do material (grau, starcharge, crude)', en: 'Material modifiers (grade, starcharge, crude)' } },
  { id: 'part', label: { pt: 'Propriedades da parte e compressão por operação', en: 'Part properties and compression per operation' } },
  { id: 'item', label: { pt: 'Conjunto do item e compute', en: 'Item properties and compute' } },
  { id: 'traits', label: { pt: 'Bônus de traits', en: 'Trait bonuses' } },
  { id: 'final', label: { pt: 'Valor final com limites', en: 'Final value with limits' } },
] as const satisfies ReadonlyArray<{ id: string; label: Localized }>;

export type PipelinePhaseId = (typeof PIPELINE_PHASES)[number]['id'];

const ptNum = (n: number) => String(n).replace('.', ',');
const pct = (mul: number) => Math.round(mul * 100);

const gradeTable = () =>
  (Object.entries(GRADE_MULTIPLIERS) as [Grade, number][])
    .filter(([grade]) => grade !== 'NONE')
    .map(([grade, mul]) => `${grade} = ${pct(mul)}%`)
    .join(' · ');

const alloyLimitsLine = () =>
  (['metal', 'gem', 'fabric', 'crude', 'super'] as const)
    .map((type) => `${ALLOY_CONFIGS[type].machineName.en}: ${ALLOY_CONFIGS[type].maxIngredients}`)
    .join(' · ');

/** Montadas a cada chamada para que os números acompanhem as constantes do calculador. */
export function buildFormulaSections(): FormulaSection[] {
  const syn = SYNERGY_CONSTANTS;
  const sc = STARCHARGE_CONSTANTS;
  return [
    {
      id: 'pipeline',
      title: { pt: 'Pipeline do cálculo', en: 'Calculation pipeline' },
      text: {
        pt: `Cada atributo passa pelas mesmas etapas, nesta ordem: ${PIPELINE_PHASES.map((p) => p.label.pt).join(' → ')}.`,
        en: `Every attribute goes through the same stages, in this order: ${PIPELINE_PHASES.map((p) => p.label.en).join(' → ')}.`,
      },
      formula: ['final = clamp( compute( compress( modifiers( material ) ) ) + traits )'],
      source: [src('util/GearData.java', 120, 124), src('util/GearData.java', 247, 304)],
    },
    {
      id: 'operations',
      title: { pt: 'Operações', en: 'Operations' },
      text: {
        pt: 'As operações são aplicadas nesta ordem: AVERAGE, MAX, MULTIPLY_BASE, MULTIPLY_TOTAL e ADD. Um número sem operação é tratado como AVERAGE. A média é ponderada: um valor maior pesa mais, em relação ao primeiro (primário).',
        en: 'Operations are applied in this order: AVERAGE, MAX, MULTIPLY_BASE, MULTIPLY_TOTAL and ADD. A number without an operation is treated as AVERAGE. The average is weighted: a larger value weighs more, relative to the first (primary) one.',
      },
      formula: ['weight = 1 + v / (1 + |primary|)', 'average = Σ(v × weight) / Σ(weight)'],
      source: [src('api/property/NumberProperty.java', 30, 41), src('api/property/NumberProperty.java', 112, 142), src('api/property/NumberProperty.java', 193, 208)],
    },
    {
      id: 'grade',
      title: { pt: 'Grau', en: 'Grade' },
      text: {
        pt: 'O grau acrescenta uma porcentagem ao valor, em módulo. Recebem grau as propriedades do material; não recebem grau as propriedades da própria parte, a velocidade de ataque e a raridade.',
        en: 'Grade adds a percentage of the absolute value. Material properties receive grade; the part\'s own properties, attack speed and rarity do not.',
      },
      formula: [gradeTable(), 'value + |value| × grade'],
      source: [src('api/part/MaterialGrade.java', 25), src('gear/part/CoreGearPart.java', 125, 133)],
    },
    {
      id: 'synergy',
      title: { pt: 'Sinergia', en: 'Synergy' },
      text: {
        pt: `Ligas com mais materiais únicos ganham sinergia pela curva abaixo. Cada categoria compartilhada soma um bônus; materiais sem nenhuma categoria comum a todos pagam uma penalidade; a diferença de raridade para o primário também reduz. O resultado fica entre ${ptNum(syn.minValue)} e ${ptNum(syn.maxValue)}. Afeta: ${[...STATS_AFFECTED_BY_SYNERGY].join(', ')}.`,
        en: `Alloys with more unique materials gain synergy from the curve below. Each shared category adds a bonus; materials with no category common to all pay a penalty; the rarity gap to the primary also reduces it. The result stays between ${syn.minValue} and ${syn.maxValue}. Affects: ${[...STATS_AFFECTED_BY_SYNERGY].join(', ')}.`,
      },
      formula: [
        `base = ${syn.curveA} × x/(x + ${syn.curveA}) + 1/(1 + ${syn.curveA})   (x = unique materials)`,
        `+ ${syn.sharedCategoryBonus} × k/(n − x + 1)   per shared category, k > 1`,
        `− ${syn.noSharedCategoryPenalty}   if no category is common to all`,
        `− ${syn.rarityWeight} × |primary rarity − rarity|`,
        `clamp(${syn.minValue}, ${syn.maxValue})`,
        'value + |value| × (synergy − 1)',
      ],
      source: [src('util/SynergyUtils.java', 22, 27), src('util/SynergyUtils.java', 36, 74), src('util/SynergyUtils.java', 110)],
    },
    {
      id: 'alloys',
      title: { pt: 'Ligas', en: 'Alloys' },
      text: {
        pt: `Os submateriais entram sem aprimoramentos; compressão, sinergia, grau e starcharge são aplicados à liga depois. Cada tipo de liga tem a sua máquina, categorias aceitas e limite de materiais. A liga crua multiplica as propriedades afetadas por sinergia por ${ptNum(CRUDE_PROPERTY_MULTIPLIER)} (padrão da configuração do mod), por último.`,
        en: `Sub-materials enter without enhancements; compression, synergy, grade and starcharge are then applied to the alloy. Each alloy type has its own machine, accepted categories and material limit. The crude alloy multiplies the synergy-affected properties by ${CRUDE_PROPERTY_MULTIPLIER} (the mod config default), last.`,
      },
      formula: [alloyLimitsLine(), `crude: value × ${CRUDE_PROPERTY_MULTIPLIER}   (last)`],
      source: [src('gear/material/CompoundMaterial.java', 139, 172), src('util/Const.java', 70, 135), src('gear/material/modifier/CrudeMaterialModifier.java', 45)],
    },
    {
      id: 'starcharge',
      title: { pt: 'Starcharge', en: 'Starcharge' },
      text: {
        pt: 'A carga é o nível de starcharge vezes o charging_value do material (média ponderada nas ligas). A fórmula muda por propriedade, só vale para AVERAGE, MAX e ADD e é aplicada depois do grau.',
        en: 'The charge is the starcharge level times the material\'s charging_value (a weighted average for alloys). The formula changes per property, only applies to AVERAGE, MAX and ADD, and runs after grade.',
      },
      formula: [
        'c = level × charging_value',
        `durability × ${sc.durabilityBase}^c`,
        `armor_durability, enchantment_value × ${sc.armorDurabilityBase}^c`,
        `armor, armor_toughness, magic_armor + ${sc.armorPerCharge} × c`,
        `harvest_speed + ${sc.harvestSpeedPerLevel} × level × c`,
        `melee_damage + c · ranged_damage + c / ${sc.rangedDivisor}`,
      ],
      source: [src('gear/material/modifier/StarchargedMaterialModifier.java', 73, 100), src('gear/material/modifier/ChargedMaterialModifier.java', 34, 35)],
    },
    {
      id: 'parts-and-types',
      title: { pt: 'Partes e tipos de item', en: 'Parts and item types' },
      text: {
        pt: `O dano e a velocidade base vêm da parte. Há chaves por tipo de item (por exemplo attack_speed/axe, armor/chestplate). A durabilidade de armadura é inteiro vezes inteiro. A velocidade de ataque fica entre ${ptNum(ATTACK_SPEED_LIMITS.min)} e ${ptNum(ATTACK_SPEED_LIMITS.max)}. O tier de coleta é o melhor entre as partes.`,
        en: `Base damage and speed come from the part. There are per-item-type keys (for example attack_speed/axe, armor/chestplate). Armor durability is integer times integer. Attack speed stays between ${ATTACK_SPEED_LIMITS.min} and ${ATTACK_SPEED_LIMITS.max}. The harvest tier is the best among the parts.`,
      },
      formula: [`attack_speed ∈ [${ATTACK_SPEED_LIMITS.min}, ${ATTACK_SPEED_LIMITS.max}]`, 'harvest_tier = max(parts)'],
      source: [src('api/property/GearPropertyMap.java', 206, 231), src('item/gear/GearArmorItem.java', 107, 110), src('setup/gear/GearProperties.java', 195, 201), src('api/property/HarvestTierProperty.java', 48, 56)],
    },
    {
      id: 'traits',
      title: { pt: 'Traits', en: 'Traits' },
      text: {
        pt: 'Há quatro famílias: os que mexem em atributos (o bônus é multiplicador × nível × razão de dano × valor original, e é nulo no item novo quando multiplicam a razão de dano); os de sinergia (synergistic, rustic, crude); a normalização do nível quando o mesmo trait vem de vários materiais; e os que só têm efeito no jogo. O GearLabs lista os traits e seus níveis, mas não aplica o bônus de atributos dos traits.',
        en: 'There are four families: those that change attributes (the bonus is multiplier × level × damage ratio × original value, and is zero on a new item when they multiply the damage ratio); the synergy ones (synergistic, rustic, crude); level normalisation when the same trait comes from several materials; and those that only have an in-game effect. GearLabs lists the traits and their levels, but does not apply the traits\' attribute bonus.',
      },
      formula: ['bonus = multiplier × level × damageRatio × originalValue'],
      source: [src('gear/trait/effect/NumberPropertyModifierTraitEffect.java', 75, 90), src('gear/trait/effect/NumberPropertyModifierTraitEffect.java', 125, 134), src('util/GearData.java', 271, 289), src('api/property/TraitListProperty.java', 78, 103)],
      unobserved: true,
    },
    {
      id: 'addons-config',
      title: { pt: 'Addons e configuração', en: 'Addons and config' },
      text: {
        pt: 'Addons como o Metalworks acrescentam materiais e categorias; como a sinergia depende de categorias, uma categoria a mais ou a menos muda o resultado. O multiplicador da liga crua vem do arquivo silentgear-common.toml e o GearLabs não lê esse arquivo. As camadas de addon do catálogo estão na issue #47.',
        en: 'Addons such as Metalworks add materials and categories; since synergy depends on categories, one more or one fewer changes the result. The crude alloy multiplier comes from silentgear-common.toml, and GearLabs does not read that file. The catalog\'s addon layers are covered in issue #47.',
      },
      formula: ['synergy = f(categories)'],
      source: [src('gear/material/modifier/CrudeMaterialModifier.java', 45)],
      unobserved: true,
    },
    {
      id: 'color',
      title: { pt: 'Cor', en: 'Color' },
      text: {
        pt: 'A cor de uma liga é a mistura Mixbox das cores dos submateriais, não a média RGB: misturar azul e amarelo dá verde, como tinta, e não cinza. Detalhes na issue #31.',
        en: 'An alloy\'s colour is the Mixbox blend of its sub-materials\' colours, not the RGB average: mixing blue and yellow gives green, like paint, not grey. Details in issue #31.',
      },
      formula: ['alloyColor = mixbox( subMaterialColors )'],
      source: [src('gear/material/CompoundMaterial.java', 210, 212)],
    },
  ];
}

export const PROPERTY_KEYS = [
  ...STATS_AFFECTED_BY_SYNERGY,
  'attack_speed',
  'rarity',
  'harvest_tier',
  'traits',
  'color',
] as const;

export interface ModElementEffect {
  id: string;
  element: Localized;
  affects: string[];
  phase: PipelinePhaseId;
  sectionId: string;
}

const ALL_STATS = PROPERTY_KEYS.filter((key) => key !== 'traits' && key !== 'color');

export const MOD_ELEMENT_EFFECTS: ModElementEffect[] = [
  { id: 'material', element: { pt: 'Material', en: 'Material' }, affects: [...ALL_STATS], phase: 'material-properties', sectionId: 'pipeline' },
  { id: 'part', element: { pt: 'Parte', en: 'Part' }, affects: ['melee_damage', 'attack_speed', 'harvest_speed', 'rarity'], phase: 'part', sectionId: 'parts-and-types' },
  { id: 'grade', element: { pt: 'Grau', en: 'Grade' }, affects: [...STATS_AFFECTED_BY_SYNERGY], phase: 'material-modifiers', sectionId: 'grade' },
  { id: 'starcharge', element: { pt: 'Starcharge', en: 'Starcharge' }, affects: ['durability', 'armor', 'armor_durability', 'armor_toughness', 'magic_armor', 'enchantment_value', 'harvest_speed', 'melee_damage', 'ranged_damage'], phase: 'material-modifiers', sectionId: 'starcharge' },
  { id: 'alloy', element: { pt: 'Liga', en: 'Alloy' }, affects: [...STATS_AFFECTED_BY_SYNERGY, 'color'], phase: 'material-properties', sectionId: 'alloys' },
  { id: 'trait', element: { pt: 'Trait', en: 'Trait' }, affects: ['traits', 'armor', 'durability', 'melee_damage'], phase: 'traits', sectionId: 'traits' },
  { id: 'addon', element: { pt: 'Addon', en: 'Addon' }, affects: ['traits', 'color'], phase: 'material-properties', sectionId: 'addons-config' },
  { id: 'item-type', element: { pt: 'Tipo de item', en: 'Item type' }, affects: ['armor', 'armor_durability', 'attack_speed', 'harvest_tier'], phase: 'item', sectionId: 'parts-and-types' },
  { id: 'config', element: { pt: 'Configuração do mod', en: 'Mod config' }, affects: [...STATS_AFFECTED_BY_SYNERGY], phase: 'material-modifiers', sectionId: 'addons-config' },
];

export interface KnownLimitation {
  id: string;
  text: Localized;
  /** Issue aberta que acompanha a limitação; ausente quando não há issue. */
  issue?: number;
}

/** Só o que continua verdadeiro no código; remova a entrada quando a issue fechar. */
export const KNOWN_LIMITATIONS: KnownLimitation[] = [
  {
    id: 'trait-bonuses',
    text: {
      pt: 'O bônus de atributos dos traits (por exemplo os que multiplicam dano ou armadura) não entra no valor mostrado; os traits aparecem só como lista.',
      en: 'The attribute bonus from traits (for example those that multiply damage or armour) is not part of the shown value; traits only appear as a list.',
    },
  },
  {
    id: 'mod-config',
    text: {
      pt: 'A configuração do servidor (silentgear-common.toml) não é lida; vale o padrão do mod para o multiplicador da liga crua.',
      en: 'The server config (silentgear-common.toml) is not read; the mod default applies to the crude alloy multiplier.',
    },
  },
  {
    id: 'catalog-snapshot',
    text: {
      pt: 'O catálogo do ATM11 publicado é o do pack 0.11.1-beta; a 0.13.0-beta ainda não tem catálogo próprio.',
      en: 'The published ATM11 catalog is the 0.11.1-beta pack\'s; 0.13.0-beta does not have its own catalog yet.',
    },
    issue: 98,
  },
  {
    id: 'kubegroovy-materials',
    text: {
      pt: 'O extrator ainda não descobre materiais definidos em kubegroovy/ ou em qualquer jar.',
      en: 'The extractor does not yet discover materials defined in kubegroovy/ or in any jar.',
    },
    issue: 93,
  },
];

// --- Exemplo trabalhado: peitoral do save (fixture de #29) -------------------

/** Recorte do catálogo publicado do atm11: só os seis materiais e o tipo de item do exemplo. */
export const EXAMPLE_CATALOG = exampleCatalogJson as unknown as VersionCatalog;

/** Valor de `armor` gravado pelo jogo para este peitoral (tests/fixtures/reference_live_save.json). */
export const EXAMPLE_IN_GAME_ARMOR = 40.9727668762207;

const EXAMPLE_ALLOY_IDS = [
  'silentgear:tyrian_steel',
  'silentgear:unobtainium',
  'sgearmetalworks:uru_metal',
  'silentgear:vibranium',
  'silentgear:allthemodium',
];

export const EXAMPLE_BUILD: GearBuild = {
  gearTypeId: 'chestplate',
  parts: {
    main: {
      materialId: 'silentgear:tyrian_steel',
      grade: 'MAX',
      starcharge: 3,
      materials: EXAMPLE_ALLOY_IDS.map((materialId) => ({ materialId })),
      instances: Array.from({ length: 8 }, () => ({ grade: 'MAX' as const, starcharge: 3 as const })),
    },
    coating: { materialId: 'silentgear:netherite', grade: 'MAX', starcharge: 3 },
  },
};

export interface WorkedExample {
  materialIds: string[];
  average: number;
  synergy: number;
  afterSynergy: number;
  gradeBonus: number;
  afterGrade: number;
  chargingValue: number;
  starchargeLevel: number;
  starchargeBonus: number;
  afterStarcharge: number;
  finalArmor: number;
  inGameArmor: number;
}

/** Cada passo vem das funções exportadas do calculador; o final vem de `calculateGearStats`. */
export function computeWorkedExample(): WorkedExample {
  const main = EXAMPLE_BUILD.parts.main!;
  const gearType = EXAMPLE_BUILD.gearTypeId;
  const materials = (main.materials ?? []).map((m) => EXAMPLE_CATALOG.materials[m.materialId]);

  const rawArmor = materials.flatMap((mat) => {
    const entry = resolveTypedStat(mat.stats.main, 'armor', gearType);
    return entry === undefined ? [] : extractModifiers(entry, 'AVERAGE');
  });
  const average = compressModifiersForProperty(rawArmor, 'AVERAGE')[0].value;

  const composed = composeCompoundSlotModifiers(materials, 'main', true, gearType, main.alloyType);
  const afterSynergy = applySynergyBonus(average, composed.synergy);

  const gradeBonus = GRADE_MULTIPLIERS[main.grade ?? 'NONE'];
  const afterGrade = applyGradeBonus(afterSynergy, gradeBonus);

  const chargingValue = composed.chargingValueMods[0].value;
  const starchargeLevel = main.starcharge ?? 0;
  const afterStarcharge = applyStarcharge(afterGrade, 'armor', starchargeLevel, chargingValue, 'AVERAGE');

  return {
    materialIds: materials.map((m) => m.id),
    average,
    synergy: composed.synergy,
    afterSynergy,
    gradeBonus,
    afterGrade,
    chargingValue,
    starchargeLevel,
    starchargeBonus: afterStarcharge - afterGrade,
    afterStarcharge,
    finalArmor: calculateGearStats(EXAMPLE_BUILD, EXAMPLE_CATALOG).armor,
    inGameArmor: EXAMPLE_IN_GAME_ARMOR,
  };
}
