import { describe, it, expect } from 'vitest';
import { evaluateTraitCondition, collectActiveTraits } from './trait-conditions';
import { parseTraitJson } from './trait-parser';
import { GearBuild, Material, VersionCatalog } from '@/types/silentgear';

const ctx = (overrides: Partial<Parameters<typeof evaluateTraitCondition>[1]> = {}) => ({
  gearTypeId: 'helmet',
  enforceGearType: true,
  componentCount: 5,
  componentsWithTrait: 1,
  ...overrides,
});

describe('evaluateTraitCondition', () => {
  it('material_ratio compara a fração de componentes com o trait', () => {
    const ratio = (r: number) => ({ type: 'silentgear:material_ratio' as const, ratio: r });
    expect(evaluateTraitCondition(ratio(0.2), ctx())).toBe(true);
    expect(evaluateTraitCondition(ratio(0.5), ctx())).toBe(false);
  });

  it('material_count compara o número de componentes com o trait', () => {
    const count = (n: number) => ({ type: 'silentgear:material_count' as const, count: n });
    expect(evaluateTraitCondition(count(1), ctx())).toBe(true);
    expect(evaluateTraitCondition(count(3), ctx())).toBe(false);
  });

  it('or, and e not combinam as condições filhas', () => {
    const ratio = { type: 'silentgear:material_ratio' as const, ratio: 0.5 };
    const count = { type: 'silentgear:material_count' as const, count: 1 };
    expect(evaluateTraitCondition({ type: 'silentgear:or', values: [ratio, count] }, ctx())).toBe(true);
    expect(evaluateTraitCondition({ type: 'silentgear:and', values: [ratio, count] }, ctx())).toBe(false);
    expect(evaluateTraitCondition({ type: 'silentgear:not', value: ratio }, ctx())).toBe(true);
  });

  it('gear_type usa a hierarquia do item e é ignorado no contexto de material', () => {
    const boots = { type: 'silentgear:gear_type' as const, gear_type: 'silentgear:boots' };
    const armor = { type: 'silentgear:gear_type' as const, gear_type: 'silentgear:armor' };
    expect(evaluateTraitCondition(armor, ctx())).toBe(true);
    expect(evaluateTraitCondition(boots, ctx())).toBe(false);
    expect(evaluateTraitCondition(boots, ctx({ enforceGearType: false }))).toBe(true);
  });
});

describe('collectActiveTraits', () => {
  const mat = (id: string, traits: Material['traits']): Material => ({
    id,
    name: { en: id, pt: id },
    tier: 0,
    category: 'metal',
    color: '#ffffff',
    stats: { main: {} },
    traits,
  });
  const armorOnly = { type: 'silentgear:gear_type' as const, gear_type: 'silentgear:armor' };
  const half = { type: 'silentgear:material_ratio' as const, ratio: 0.5 };
  const catalog = {
    materials: {
      a: mat('a', { main: [{ name: 'x:armor_only', level: 1, conditions: [armorOnly] }, { name: 'x:needs_half', level: 2, conditions: [half] }] }),
      b: mat('b', { main: [] }),
    },
    gearTypes: {},
    traits: {
      'x:tool_only': { id: 'x:tool_only', maxLevel: 5, name: { en: '', pt: '' }, description: { en: '', pt: '' }, conditions: [{ type: 'silentgear:gear_type' as const, gear_type: 'silentgear:tool' }] },
    },
    version: 't',
  } as unknown as VersionCatalog;
  const names = (build: GearBuild) => collectActiveTraits(build, catalog).map((t) => t.name);

  it('material puro na parte principal respeita gear_type do material', () => {
    expect(names({ gearTypeId: 'sword', parts: { main: { materialId: 'a' } } })).toEqual(['x:needs_half']);
    expect(names({ gearTypeId: 'helmet', parts: { main: { materialId: 'a' } } })).toEqual(['x:armor_only', 'x:needs_half']);
  });

  it('liga ignora gear_type do material mas aplica material_ratio entre os submateriais', () => {
    const alloy = (ids: string[]): GearBuild => ({
      gearTypeId: 'sword',
      parts: { main: { materialId: ids[0], materials: ids.map((materialId) => ({ materialId })) } },
    });
    expect(names(alloy(['a', 'b']))).toEqual(['x:armor_only', 'x:needs_half']);
    expect(names(alloy(['a', 'b', 'b']))).toEqual(['x:armor_only']);
  });
});

describe('parseTraitJson', () => {
  const lang = { en: { 'trait.t.x': 'X', 'trait.t.x.desc': 'does x' }, pt: { 'trait.t.x': 'Xis' } };
  it('lê max_level, condições e textos do lang com fallback para o inglês', () => {
    const cond = [{ type: 'silentgear:gear_type' as const, gear_type: 'silentgear:armor' }];
    const info = parseTraitJson(
      't:x',
      { name: { translate: 'trait.t.x' }, description: { translate: 'trait.t.x.desc' }, max_level: 3, conditions: cond },
      lang
    );
    expect(info).toEqual({
      id: 't:x',
      maxLevel: 3,
      name: { en: 'X', pt: 'Xis' },
      description: { en: 'does x', pt: 'does x' },
      conditions: cond,
    });
  });
});
