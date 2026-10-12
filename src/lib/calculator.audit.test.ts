import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as calculator from './calculator';
import { calculateGearStats } from './calculator';
import { GearBuild, VersionCatalog } from '@/types/silentgear';
import atm11Json from '../../public/data/versions/atm11/catalog.json';

const atm11 = atm11Json as unknown as VersionCatalog;
const liveSave = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../tests/fixtures/reference_live_save.json'), 'utf8')
);

const traitKeys = (stats: ReturnType<typeof calculateGearStats>) =>
  stats.traits.map((t) => `${t.id}:${t.level}`).sort();

describe('Auditoria #43: traits iguais às do jogo (save local)', () => {
  it.each(['chestplate', 'helmet'])(
    '%s de liga de cinco metais lista exatamente os traits gravados pelo jogo',
    (piece) => {
      const item = liveSave.items[piece];
      const stats = calculateGearStats({ gearTypeId: item.gearTypeId, parts: item.parts }, atm11);

      expect(traitKeys(stats)).toEqual(item.expectedTraits);
    }
  );

  it('sturdy e void_ward (material_ratio 0,5 do tyrian_steel) não aparecem quando o aço é 1/5 da liga', () => {
    const item = liveSave.items.chestplate;
    const stats = calculateGearStats({ gearTypeId: item.gearTypeId, parts: item.parts }, atm11);
    const ids = stats.traits.map((t) => t.id);

    expect(ids).not.toContain('silentgear:sturdy');
    expect(ids).not.toContain('silentgear:void_ward');
  });

  it('controle: com tyrian_steel puro (razão 1,0) sturdy e void_ward aparecem', () => {
    const build: GearBuild = {
      gearTypeId: 'chestplate',
      parts: { main: { materialId: 'silentgear:tyrian_steel' } },
    };
    const ids = calculateGearStats(build, atm11).traits.map((t) => t.id);

    expect(ids).toContain('silentgear:sturdy');
    expect(ids).toContain('silentgear:void_ward');
  });
});

describe('Auditoria #34: katana do save contra os valores gravados pelo jogo', () => {
  const katana = liveSave.items.katana;
  const expected = katana.expectedInGameProperties;
  const stats = calculateGearStats({ gearTypeId: katana.gearTypeId, parts: katana.parts }, atm11);

  it('attack_speed', () => {
    expect(stats.attackSpeed).toBeCloseTo(expected.attack_speed, 1);
  });

  it('attack_damage', () => {
    expect(stats.meleeDamage).toBeCloseTo(expected.attack_damage, 0);
  });

  it('harvest_speed', () => {
    expect(stats.harvestSpeed).toBeCloseTo(expected.harvest_speed, 0);
  });

  it('durability', () => {
    expect(Math.abs(stats.durability - expected.durability)).toBeLessThanOrEqual(1);
  });

  it('rarity', () => {
    expect(Math.abs(stats.rarity - expected.rarity)).toBeLessThanOrEqual(0.5);
  });

  it('harvest_tier', () => {
    expect(stats.harvestTier).toContain(katana.expectedHarvestTier);
  });
});

describe('Auditoria #30: liga crua aplica o multiplicador depois de grau e starcharge', () => {
  const alloy = (alloyType: 'metal' | 'crude', starcharge: 0 | 3): GearBuild => ({
    gearTypeId: 'chestplate',
    parts: {
      main: {
        materialId: 'silentgear:tyrian_steel',
        grade: 'MAX',
        starcharge,
        alloyType,
        materials: [{ materialId: 'silentgear:tyrian_steel' }, { materialId: 'sgearmetalworks:uru_metal' }],
      },
    },
  });

  it('armadura crua com starcharge III é 0,8 da armadura da liga normal (CrudeMaterialModifier vem depois de starcharged)', () => {
    // MaterialModifiers registra grade, starcharged, crude nessa ordem; MaterialInstance aplica na ordem do registro.
    const withoutStarcharge = calculateGearStats(alloy('crude', 0), atm11).armor / calculateGearStats(alloy('metal', 0), atm11).armor;
    expect(withoutStarcharge).toBeCloseTo(0.8, 2);

    const crude = calculateGearStats(alloy('crude', 3), atm11).armor;
    const normal = calculateGearStats(alloy('metal', 3), atm11).armor;
    expect(crude / normal).toBeCloseTo(0.8, 2);
  });
});

describe('Auditoria #41: a interface não pode mostrar valores inventados quando o cálculo falha', () => {
  it('calculateGearStatsSafe devolve o erro e nenhum stat para armadura sem armor_durability', () => {
    const { calculateGearStatsSafe } = calculator as unknown as {
      calculateGearStatsSafe: (b: GearBuild, c: VersionCatalog) => { stats: unknown; error: string | null };
    };
    const build: GearBuild = { gearTypeId: 'chestplate', parts: { main: { materialId: 'silentgear:redstone' } } };

    const result = calculateGearStatsSafe(build, atm11);

    expect(result.stats).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('calculateGearStatsSafe devolve stats e nenhum erro para uma build válida', () => {
    const { calculateGearStatsSafe } = calculator as unknown as {
      calculateGearStatsSafe: (b: GearBuild, c: VersionCatalog) => { stats: { armor: number } | null; error: string | null };
    };
    const build: GearBuild = { gearTypeId: 'chestplate', parts: { main: { materialId: 'silentgear:iron' } } };

    const result = calculateGearStatsSafe(build, atm11);

    expect(result.error).toBeNull();
    expect(result.stats?.armor).toBeGreaterThan(0);
  });
});
