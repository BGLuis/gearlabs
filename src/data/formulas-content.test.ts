import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  buildFormulaSections,
  MOD_ELEMENT_EFFECTS,
  KNOWN_LIMITATIONS,
  PIPELINE_PHASES,
  PROPERTY_KEYS,
  SILENT_GEAR_COMMIT,
  sourceUrl,
  sourceLabel,
  computeWorkedExample,
  EXAMPLE_BUILD,
  EXAMPLE_CATALOG,
  EXAMPLE_IN_GAME_ARMOR,
} from './formulas-content';
import { GRADE_MULTIPLIERS, Grade, VersionCatalog } from '@/types/silentgear';
import { SYNERGY_CONSTANTS, STARCHARGE_CONSTANTS, calculateGearStats } from '@/lib/calculator';
import { readAtm11Catalog } from '../../tests/helpers/atm11-catalog';

// O save do exemplo (#29) foi jogado na 0.11.1-beta: o recorte é dessa versão, que é imutável.
const atm11: VersionCatalog = readAtm11Catalog('0.11.1-beta');
const liveSave = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../tests/fixtures/reference_live_save.json'), 'utf8')
);

const allText = (s: { title: { pt: string; en: string }; text: { pt: string; en: string }; formula: string[] }) =>
  [s.title.pt, s.title.en, s.text.pt, s.text.en, ...s.formula].join('\n');

const section = (id: string) => {
  const s = buildFormulaSections().find((x) => x.id === id);
  if (!s) throw new Error(`section ${id} missing`);
  return s;
};

describe('#64: estrutura das seções', () => {
  it('cobre os itens 1 a 10 da issue com ids únicos', () => {
    const ids = buildFormulaSections().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      'pipeline', 'operations', 'grade', 'synergy', 'alloys', 'starcharge',
      'parts-and-types', 'traits', 'addons-config', 'color',
    ]);
  });

  it.each(buildFormulaSections().map((s) => [s.id, s] as const))('%s tem título e texto em pt e en', (_id, s) => {
    for (const lang of ['pt', 'en'] as const) {
      expect(s.title[lang].trim()).not.toBe('');
      expect(s.text[lang].trim()).not.toBe('');
    }
  });

  it.each(buildFormulaSections().filter((s) => s.id !== 'addons-config').map((s) => [s.id, s] as const))(
    '%s tem fonte do Silent Gear com arquivo e linhas válidas',
    (_id, s) => {
      expect(s.source.length).toBeGreaterThan(0);
      for (const ref of s.source) {
        expect(ref.file).toMatch(/^src\/main\/java\/.+\.java$/);
        expect(ref.startLine).toBeGreaterThan(0);
        expect(ref.endLine ?? ref.startLine).toBeGreaterThanOrEqual(ref.startLine);
      }
    }
  );

  it('addons e config aponta para o código do Silent Gear e para #47, sem inventar linhas', () => {
    expect(section('addons-config').source.length).toBeGreaterThan(0);
    expect(allText(section('addons-config'))).toContain('#47');
  });

  it('cor aponta para #31', () => {
    expect(allText(section('color'))).toContain('#31');
  });

  it('traits está marcada como lida no código e não observada no jogo', () => {
    expect(section('traits').unobserved).toBe(true);
    expect(section('addons-config').unobserved).toBe(true);
  });
});

describe('#64: links de fonte', () => {
  it('sourceUrl usa o commit cb9926f completo e a âncora de linhas', () => {
    expect(SILENT_GEAR_COMMIT).toBe('cb9926f4a3215a2f6016e4b465d1029ce06251e4');
    const url = sourceUrl({ file: 'src/main/java/net/silentchaos512/gear/util/SynergyUtils.java', startLine: 36, endLine: 74 });
    expect(url).toBe(
      `https://github.com/SilentChaos512/Silent-Gear/blob/${SILENT_GEAR_COMMIT}/src/main/java/net/silentchaos512/gear/util/SynergyUtils.java#L36-L74`
    );
  });

  it('linha única não repete o intervalo, e o rótulo é arquivo:linhas', () => {
    const ref = { file: 'src/main/java/net/silentchaos512/gear/api/part/MaterialGrade.java', startLine: 25 };
    expect(sourceUrl(ref)).toMatch(/MaterialGrade\.java#L25$/);
    expect(sourceLabel(ref)).toBe('MaterialGrade.java:25');
    expect(sourceLabel({ ...ref, startLine: 30, endLine: 41 })).toBe('MaterialGrade.java:30-41');
  });

  it('toda URL gerada contém o commit', () => {
    for (const s of buildFormulaSections()) for (const r of s.source) expect(sourceUrl(r)).toContain(SILENT_GEAR_COMMIT);
  });
});

describe('#64: números lidos do calculador, não digitados', () => {
  it('a tabela de graus vem de GRADE_MULTIPLIERS', () => {
    const text = allText(section('grade'));
    for (const [grade, mul] of Object.entries(GRADE_MULTIPLIERS) as [Grade, number][]) {
      if (grade === 'NONE') continue;
      expect(text).toContain(`${grade} = ${Math.round(mul * 100)}%`);
    }
  });

  it('alterar GRADE_MULTIPLIERS.MAX muda o conteúdo da seção de grau', () => {
    const original = GRADE_MULTIPLIERS.MAX;
    const before = allText(section('grade'));
    try {
      GRADE_MULTIPLIERS.MAX = 0.99;
      expect(allText(section('grade'))).not.toBe(before);
      expect(allText(section('grade'))).toContain('MAX = 99%');
    } finally {
      GRADE_MULTIPLIERS.MAX = original;
    }
  });

  it('a seção de sinergia cita as constantes de SYNERGY_CONSTANTS', () => {
    const text = allText(section('synergy'));
    expect(text).toContain(String(SYNERGY_CONSTANTS.curveA));
    expect(text).toContain(String(SYNERGY_CONSTANTS.sharedCategoryBonus));
    expect(text).toContain(String(SYNERGY_CONSTANTS.noSharedCategoryPenalty));
    expect(text).toContain(String(SYNERGY_CONSTANTS.minValue));
    expect(text).toContain(String(SYNERGY_CONSTANTS.maxValue));
  });

  it('a seção de starcharge cita STARCHARGE_CONSTANTS', () => {
    const text = allText(section('starcharge'));
    expect(text).toContain(String(STARCHARGE_CONSTANTS.durabilityBase));
    expect(text).toContain(String(STARCHARGE_CONSTANTS.armorPerCharge));
  });

  it('a seção de ligas cita limites e máquinas de ALLOY_CONFIGS', () => {
    const text = allText(section('alloys'));
    expect(text).toContain('Alloy Forge');
    expect(text).toContain('Crude Mixer');
  });
});

describe('#64: tabela elemento do mod → efeito', () => {
  const sectionIds = buildFormulaSections().map((s) => s.id);
  const phaseIds = PIPELINE_PHASES.map((p) => p.id);

  it('tem uma linha para cada elemento pedido na issue', () => {
    expect(MOD_ELEMENT_EFFECTS.map((r) => r.id)).toEqual([
      'material', 'part', 'grade', 'starcharge', 'alloy', 'trait', 'addon', 'item-type', 'config',
    ]);
  });

  it.each(MOD_ELEMENT_EFFECTS.map((r) => [r.id, r] as const))('%s referencia seção, fase e propriedades que existem', (_id, row) => {
    expect(sectionIds).toContain(row.sectionId);
    expect(phaseIds).toContain(row.phase);
    expect(row.affects.length).toBeGreaterThan(0);
    for (const key of row.affects) expect(PROPERTY_KEYS).toContain(key);
    expect(row.element.pt).not.toBe('');
    expect(row.element.en).not.toBe('');
  });

  it('grau e sinergia afetam as propriedades que o calculador marca', () => {
    const syn = MOD_ELEMENT_EFFECTS.find((r) => r.id === 'alloy')!;
    expect(syn.affects).toEqual(expect.arrayContaining(['armor', 'durability']));
  });
});

describe('#64: limitações conhecidas', () => {
  it('cada entrada tem texto bilíngue e, se há issue, é um número positivo', () => {
    expect(KNOWN_LIMITATIONS.length).toBeGreaterThan(0);
    for (const l of KNOWN_LIMITATIONS) {
      expect(l.text.pt).not.toBe('');
      expect(l.text.en).not.toBe('');
      if (l.issue !== undefined) expect(l.issue).toBeGreaterThan(0);
    }
  });
});

describe('#64: exemplo trabalhado (peitoral do save, fixture de #29)', () => {
  const saved = liveSave.items.chestplate;

  it('o recorte guarda o mesmo build do fixture e o valor gravado pelo jogo', () => {
    expect(EXAMPLE_BUILD).toEqual({ gearTypeId: saved.gearTypeId, parts: saved.parts });
    expect(EXAMPLE_IN_GAME_ARMOR).toBe(saved.expectedInGameProperties.armor);
  });

  it('cada material e o tipo de item do recorte são idênticos ao catálogo publicado do atm11 0.11.1-beta', () => {
    for (const [id, material] of Object.entries(EXAMPLE_CATALOG.materials)) {
      expect(material).toEqual(atm11.materials[id]);
    }
    expect(EXAMPLE_CATALOG.gearTypes.chestplate).toEqual(atm11.gearTypes.chestplate);
    expect(Object.keys(EXAMPLE_CATALOG.materials).sort()).toEqual(
      [
        'silentgear:tyrian_steel', 'silentgear:unobtainium', 'sgearmetalworks:uru_metal',
        'silentgear:vibranium', 'silentgear:allthemodium', 'silentgear:netherite',
      ].sort()
    );
  });

  it('o recorte e o catálogo completo dão a mesma armadura', () => {
    expect(calculateGearStats(EXAMPLE_BUILD, EXAMPLE_CATALOG).armor).toBe(calculateGearStats(EXAMPLE_BUILD, atm11).armor);
  });

  it('o resultado final sai de calculateGearStats e fecha com o jogo (40,97 ± 0,05)', () => {
    const ex = computeWorkedExample();
    expect(ex.finalArmor).toBe(calculateGearStats(EXAMPLE_BUILD, EXAMPLE_CATALOG).armor);
    expect(Math.abs(ex.finalArmor - 40.97)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(ex.afterStarcharge - saved.expectedInGameProperties.armor)).toBeLessThanOrEqual(0.05);
  });

  it('os passos intermediários seguem a ordem do pipeline e batem com os valores da issue', () => {
    const ex = computeWorkedExample();
    expect(ex.average).toBeCloseTo(17.722, 2);
    expect(ex.synergy).toBeCloseTo(1.4368, 3);
    expect(ex.afterSynergy).toBeCloseTo(25.463, 2);
    expect(ex.afterGrade).toBeCloseTo(33.102, 2);
    expect(ex.chargingValue).toBeCloseTo(1.3118, 3);
    expect(ex.starchargeBonus).toBeCloseTo(7.871, 2);
    expect(ex.afterStarcharge).toBeCloseTo(40.973, 2);
  });

  it('o passo de grau usa GRADE_MULTIPLIERS.MAX, não um número digitado', () => {
    const ex = computeWorkedExample();
    expect(ex.gradeBonus).toBe(GRADE_MULTIPLIERS.MAX);
    expect(ex.afterGrade).toBeCloseTo(ex.afterSynergy * (1 + GRADE_MULTIPLIERS.MAX), 10);
  });

  it('inclui os cinco materiais da liga', () => {
    expect(computeWorkedExample().materialIds).toHaveLength(5);
  });
});
