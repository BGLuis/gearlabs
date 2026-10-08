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

  it('não aplica sinergia entre slots mesmo quando materiais são da mesma categoria', () => {
    const build: GearBuild = {
      gearTypeId: 'sword',
      parts: {
        main: { materialId: 'silentgear:iron' },
        rod: { materialId: 'silentgear:copper' },
      },
    };

    const stats = calculateGearStats(build, catalog);
    // Ferro e Cobre são metais, mas sinergia entre slots não existe no Silent Gear
    expect(stats.synergy).toBe(100);
  });

  it('capacete com main Unobtainium + coating Netherite retorna synergy === 100 e não infla atributos do main', () => {
    const buildAlone: GearBuild = {
      gearTypeId: 'helmet',
      parts: {
        main: { materialId: 'allthemodium:unobtainium' },
      },
    };
    const buildWithCoating: GearBuild = {
      gearTypeId: 'helmet',
      parts: {
        main: { materialId: 'allthemodium:unobtainium' },
        coating: { materialId: 'silentgear:netherite' },
      },
    };

    const statsAlone = calculateGearStats(buildAlone, ATM11_CATALOG);
    const statsWithCoating = calculateGearStats(buildWithCoating, ATM11_CATALOG);

    // Sinergia deve ser neutra (100%), sem o bônus de 1.05 entre metais
    expect(statsWithCoating.synergy).toBe(100);
    // O armor base do main (35) + coating (4 no catálogo atual, cf. #5) = 39,
    // sem a multiplicação incorreta por 1.05 (que inflaria para 41)
    expect(statsWithCoating.armor).toBe(
      statsAlone.armor + (ATM11_CATALOG.materials['silentgear:netherite'].stats.coating?.armor || 0)
    );
  });

  it('preserva armadura inalterada ao adicionar coating sem stat de armor', () => {
    const buildAlone: GearBuild = {
      gearTypeId: 'helmet',
      parts: {
        main: { materialId: 'allthemodium:unobtainium' },
      },
    };
    // Mock de catálogo onde coating não concede armor (comportamento oficial do Silent Gear)
    const mockCatalog: VersionCatalog = {
      ...ATM11_CATALOG,
      materials: {
        ...ATM11_CATALOG.materials,
        'silentgear:netherite_no_armor': {
          ...ATM11_CATALOG.materials['silentgear:netherite'],
          stats: {
            ...ATM11_CATALOG.materials['silentgear:netherite'].stats,
            coating: { durability: 300, melee_damage: 1.5 },
          },
        },
      },
    };
    const buildWithCoating: GearBuild = {
      gearTypeId: 'helmet',
      parts: {
        main: { materialId: 'allthemodium:unobtainium' },
        coating: { materialId: 'silentgear:netherite_no_armor' },
      },
    };

    const statsAlone = calculateGearStats(buildAlone, mockCatalog);
    const statsWithCoating = calculateGearStats(buildWithCoating, mockCatalog);

    expect(statsWithCoating.synergy).toBe(100);
    expect(statsWithCoating.armor).toBe(statsAlone.armor);
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
    // Sinergia neutra entre partes simples (1.00); finalDamage = 22.0
    expect(stats.synergy).toBe(100);
    expect(stats.meleeDamage).toBeGreaterThanOrEqual(22.0);
    expect(stats.durability).toBeGreaterThan(50000);
    // Breeze rod adiciona +0.35 de attack speed
    expect(stats.attackSpeed).toBeGreaterThan(1.6);

    const traitIds = stats.traits.map((t) => t.id);
    expect(traitIds).toContain('allthemodium:godlike');
    expect(traitIds).toContain('silentgear:swift');
  });

  describe('Issue #4: Armadura - resolução de armor por peça e armor_durability', () => {
    it('material com armor 60 e armor/helmet 15 dá armor 15 num capacete; sem armor/helmet, dá 60', () => {
      const testCatalogWithPiece: VersionCatalog = {
        ...catalog,
        materials: {
          ...catalog.materials,
          'test:custom_armor_mat': {
            id: 'test:custom_armor_mat',
            name: { en: 'Custom Armor', pt: 'Armadura Custom' },
            tier: 1,
            category: 'metal',
            color: '#ffffff',
            stats: {
              main: {
                armor: 60,
                armor_by_piece: {
                  helmet: 15,
                },
              },
            },
            traits: {},
          },
        },
      };

      const testCatalogWithoutPiece: VersionCatalog = {
        ...catalog,
        materials: {
          ...catalog.materials,
          'test:custom_armor_mat': {
            id: 'test:custom_armor_mat',
            name: { en: 'Custom Armor', pt: 'Armadura Custom' },
            tier: 1,
            category: 'metal',
            color: '#ffffff',
            stats: {
              main: {
                armor: 60,
              },
            },
            traits: {},
          },
        },
      };

      const build: GearBuild = {
        gearTypeId: 'helmet',
        parts: {
          main: { materialId: 'test:custom_armor_mat' },
        },
      };

      const statsWithPiece = calculateGearStats(build, testCatalogWithPiece);
      const statsWithoutPiece = calculateGearStats(build, testCatalogWithoutPiece);

      expect(statsWithPiece.armor).toBe(15);
      expect(statsWithoutPiece.armor).toBe(60);
    });

    it('material com armor_durability 60 dá durabilidade 660 no capacete e 960 no peitoral', () => {
      const testCatalog: VersionCatalog = {
        ...catalog,
        materials: {
          ...catalog.materials,
          'test:durability_mat': {
            id: 'test:durability_mat',
            name: { en: 'Durability Mat', pt: 'Mat Durabilidade' },
            tier: 1,
            category: 'metal',
            color: '#ffffff',
            stats: {
              main: {
                armor_durability: 60,
                durability: 5000, // Durabilidade de ferramenta deve ser ignorada em armadura
              },
            },
            traits: {},
          },
        },
      };

      const helmetBuild: GearBuild = {
        gearTypeId: 'helmet',
        parts: {
          main: { materialId: 'test:durability_mat' },
        },
      };

      const chestBuild: GearBuild = {
        gearTypeId: 'chestplate',
        parts: {
          main: { materialId: 'test:durability_mat' },
        },
      };

      const leggingsBuild: GearBuild = {
        gearTypeId: 'leggings',
        parts: {
          main: { materialId: 'test:durability_mat' },
        },
      };

      const bootsBuild: GearBuild = {
        gearTypeId: 'boots',
        parts: {
          main: { materialId: 'test:durability_mat' },
        },
      };

      const helmetStats = calculateGearStats(helmetBuild, testCatalog);
      const chestStats = calculateGearStats(chestBuild, testCatalog);
      const leggingsStats = calculateGearStats(leggingsBuild, testCatalog);
      const bootsStats = calculateGearStats(bootsBuild, testCatalog);

      expect(helmetStats.durability).toBe(660); // 60 * 11
      expect(chestStats.durability).toBe(960); // 60 * 16
      expect(leggingsStats.durability).toBe(900); // 60 * 15
      expect(bootsStats.durability).toBe(780); // 60 * 13
    });
  });
});
