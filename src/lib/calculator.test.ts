import { describe, it, expect } from 'vitest';
import { calculateGearStats, calculateSynergy, applyGradeBonus } from './calculator';
import {
  OFFICIAL_MATERIALS_1_20,
  OFFICIAL_GEAR_TYPES,
  OFFICIAL_TRAITS,
  ATM11_CATALOG,
} from '@/data/defaultCatalog';
import { VersionCatalog, GearBuild } from '@/types/silentgear';

const catalog: VersionCatalog = {
  version: '1.20.1',
  materials: OFFICIAL_MATERIALS_1_20,
  gearTypes: OFFICIAL_GEAR_TYPES,
  traits: OFFICIAL_TRAITS,
};

describe('calculateGearStats', () => {
  it('calcula corretamente uma espada de Diamante e Madeira', () => {
    const build: GearBuild = {
      gearTypeId: 'sword',
      parts: {
        main: { materialId: 'silentgear:diamond' },
        rod: { materialId: 'silentgear:wood' },
      },
    };

    const stats = calculateGearStats(build, catalog);

    // Dano base espada (3.0) + Diamante (3.0) = 6.0
    expect(stats.meleeDamage).toBe(6.0);
    // Durabilidade: Diamante (1561) + Madeira rod (15) = 1576
    expect(stats.durability).toBe(1576);
    // Sinergia padrão entre gema e madeira = 100%
    expect(stats.synergy).toBe(100);
    // Traits: Diamante tem Brittle II e Lustrous I; Madeira tem Flexible I
    const traitIds = stats.traits.map((t) => t.id);
    expect(traitIds).toContain('silentgear:brittle');
    expect(traitIds).toContain('silentgear:lustrous');
    expect(traitIds).toContain('silentgear:flexible');
  });

  it('aplica bônus de sinergia quando materiais são da mesma categoria (metais)', () => {
    const build: GearBuild = {
      gearTypeId: 'sword',
      parts: {
        main: { materialId: 'silentgear:iron' },
        rod: { materialId: 'silentgear:copper' },
      },
    };

    const stats = calculateGearStats(build, catalog);
    // Ferro e Cobre são metais -> +5% de sinergia
    expect(stats.synergy).toBe(105);
  });

  it('aplica multiplicador de graduação de qualidade (Grade MAX dá +30%)', () => {
    const buildUngraded: GearBuild = {
      gearTypeId: 'sword',
      parts: {
        main: { materialId: 'silentgear:iron', grade: 'NONE' },
        rod: { materialId: 'silentgear:wood' },
      },
    };
    const buildGraded: GearBuild = {
      gearTypeId: 'sword',
      parts: {
        main: { materialId: 'silentgear:iron', grade: 'MAX' },
        rod: { materialId: 'silentgear:wood' },
      },
    };

    const statsUngraded = calculateGearStats(buildUngraded, catalog);
    const statsGraded = calculateGearStats(buildGraded, catalog);

    expect(statsGraded.meleeDamage).toBeGreaterThan(statsUngraded.meleeDamage);
    expect(statsGraded.durability).toBeGreaterThan(statsUngraded.durability);
    // Dano base espada (3.0) + Ferro (2.0) = 5.0. Com Grade MAX (+30%): 5.0 * 1.30 = 6.5
    expect(statsGraded.meleeDamage).toBe(6.5);
  });

  it('afirma que MAX multiplica o armor de um main de valor 10 para 13,0 e E para 10,1', () => {
    const testCatalog: VersionCatalog = {
      ...catalog,
      materials: {
        ...catalog.materials,
        'test:armor_mat': {
          id: 'test:armor_mat',
          name: { en: 'Test Armor', pt: 'Armadura Teste' },
          tier: 1,
          category: 'metal',
          color: '#ffffff',
          stats: {
            main: {
              armor: 10,
              durability: 100,
            },
          },
          traits: {},
        },
      },
    };

    const buildE: GearBuild = {
      gearTypeId: 'helmet',
      parts: {
        main: { materialId: 'test:armor_mat', grade: 'E' },
      },
    };
    const buildMax: GearBuild = {
      gearTypeId: 'helmet',
      parts: {
        main: { materialId: 'test:armor_mat', grade: 'MAX' },
      },
    };

    const statsE = calculateGearStats(buildE, testCatalog);
    const statsMax = calculateGearStats(buildMax, testCatalog);

    expect(statsE.armor).toBe(10.1);
    expect(statsMax.armor).toBe(13.0);
  });

  it('aplica a fórmula v + |v| * bônus preservando comportamento para valores negativos', () => {
    // Valor positivo com bônus de 30% (MAX): 10 + 10 * 0.30 = 13.0
    expect(applyGradeBonus(10, 0.30)).toBe(13.0);
    // Valor positivo com bônus de 1% (E): 10 + 10 * 0.01 = 10.1
    expect(applyGradeBonus(10, 0.01)).toBe(10.1);
    // Valor negativo com bônus de 30% (MAX): -10 + |-10| * 0.30 = -7.0
    expect(applyGradeBonus(-10, 0.30)).toBe(-7.0);
    // Valor com bônus de 0% (NONE):
    expect(applyGradeBonus(-10, 0.0)).toBe(-10);
  });

  it('aplica adições da ponta (Tip Slot)', () => {
    const buildWithoutTip: GearBuild = {
      gearTypeId: 'pickaxe',
      parts: {
        main: { materialId: 'silentgear:iron' },
        rod: { materialId: 'silentgear:wood' },
      },
    };
    const buildWithTip: GearBuild = {
      gearTypeId: 'pickaxe',
      parts: {
        main: { materialId: 'silentgear:iron' },
        rod: { materialId: 'silentgear:wood' },
        tip: { materialId: 'silentgear:diamond' },
      },
    };

    const withoutTip = calculateGearStats(buildWithoutTip, catalog);
    const withTip = calculateGearStats(buildWithTip, catalog);

    // Diamante no tip adiciona +256 durabilidade e +2 dano
    expect(withTip.durability).toBe(withoutTip.durability + 256);
    expect(withTip.meleeDamage).toBe(withoutTip.meleeDamage + 2.0);
  });

  it('calcula build endgame no ATM11 com Unobtainium e Breeze Rod', () => {
    const build: GearBuild = {
      gearTypeId: 'sword',
      parts: {
        main: { materialId: 'allthemodium:unobtainium' },
        rod: { materialId: 'silentgear:breeze_rod' },
        tip: { materialId: 'allthemodium:allthemodium' },
      },
    };

    const stats = calculateGearStats(build, ATM11_CATALOG);

    // Unobtainium dano 16.0 + Espada base 3.0 + Tip Allthemodium 3.0 = 22.0
    // Sinergia: Unobtainium (metal), Breeze Rod (metal), Allthemodium (metal) -> todos metais = 1.05
    // finalDamage = 22.0 * 1.05 = 23.1
    expect(stats.meleeDamage).toBeGreaterThanOrEqual(22.0);
    expect(stats.durability).toBeGreaterThan(50000);
    // Breeze rod adiciona +0.35 de attack speed
    expect(stats.attackSpeed).toBeGreaterThan(1.6);

    const traitIds = stats.traits.map((t) => t.id);
    expect(traitIds).toContain('allthemodium:godlike');
    expect(traitIds).toContain('silentgear:swift');
  });
});
