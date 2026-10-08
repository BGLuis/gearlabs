import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  calculateGearStats,
  calculateSynergy,
  applyGradeBonus,
  computeNumberProperty,
  compressModifiersForProperty,
  applyStarcharge,
  applyEnhancementsToModifiers,
} from './calculator';
import {
  OFFICIAL_MATERIALS_1_20,
  OFFICIAL_GEAR_TYPES,
  OFFICIAL_TRAITS,
  ATM11_CATALOG,
} from '@/data/defaultCatalog';
import { VersionCatalog, GearBuild, Material } from '@/types/silentgear';

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

  it('capacete com main Unobtainium + coating Netherite retorna synergy === 100, não infla armor e adiciona toughness e knockback', () => {
    const buildAlone: GearBuild = {
      gearTypeId: 'helmet',
      parts: {
        main: { materialId: 'silentgear:unobtainium' },
      },
    };
    const buildWithCoating: GearBuild = {
      gearTypeId: 'helmet',
      parts: {
        main: { materialId: 'silentgear:unobtainium' },
        coating: { materialId: 'silentgear:netherite' },
      },
    };

    const statsAlone = calculateGearStats(buildAlone, ATM11_CATALOG);
    const statsWithCoating = calculateGearStats(buildWithCoating, ATM11_CATALOG);

    // Sinergia deve ser neutra (100%), sem o bônus de 1.05 entre metais
    expect(statsWithCoating.synergy).toBe(100);
    // Coating de Netherite oficial não concede armor, preservando o armor do main
    expect(statsWithCoating.armor).toBe(statsAlone.armor);
    // Coating de Netherite concede +4 de toughness oficial
    expect(statsWithCoating.armorToughness).toBe(statsAlone.armorToughness + 4);
    // Coating de Netherite concede +1 knockback_resistance (exibida ÷ 10 = 0.1)
    expect(statsWithCoating.knockbackResistance).toBe(0.1);
  });

  it('preserva armadura inalterada ao adicionar coating sem stat de armor', () => {
    const buildAlone: GearBuild = {
      gearTypeId: 'helmet',
      parts: {
        main: { materialId: 'silentgear:unobtainium' },
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
        main: { materialId: 'silentgear:unobtainium' },
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
        main: { materialId: 'silentgear:unobtainium' },
        rod: { materialId: 'silentgear:breeze_rod' },
        tip: { materialId: 'silentgear:allthemodium' },
      },
    };

    const stats = calculateGearStats(build, ATM11_CATALOG);

    expect(stats.synergy).toBe(100);
    expect(stats.meleeDamage).toBeGreaterThanOrEqual(22.0);
    expect(stats.durability).toBeGreaterThan(9000);
    // Breeze rod adiciona +0.35 de attack speed
    expect(stats.attackSpeed).toBeGreaterThan(1.6);

    const traitIds = stats.traits.map((t) => t.id);
    expect(traitIds).toContain('silentgear:brilliant');
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

  describe('Issue #5: Slots secundários com operações e magic_armor', () => {
    it('critério 1: coating com armor_toughness ADD 4 sobre main de toughness 60 resulta em 64; armor inalterado', () => {
      const testCatalog: VersionCatalog = {
        ...catalog,
        materials: {
          ...catalog.materials,
          'test:toughness_main': {
            id: 'test:toughness_main',
            name: { en: 'Toughness Main', pt: 'Main Tenacidade' },
            tier: 1,
            category: 'metal',
            color: '#ffffff',
            stats: {
              main: {
                armor: 25,
                armor_toughness: 60,
              },
            },
            traits: {},
          },
          'test:toughness_coating': {
            id: 'test:toughness_coating',
            name: { en: 'Toughness Coating', pt: 'Coating Tenacidade' },
            tier: 1,
            category: 'metal',
            color: '#aaaaaa',
            stats: {
              coating: {
                armor_toughness: { operation: 'ADD', value: 4 },
              },
            },
            traits: {},
          },
        },
      };

      const build: GearBuild = {
        gearTypeId: 'helmet',
        parts: {
          main: { materialId: 'test:toughness_main' },
          coating: { materialId: 'test:toughness_coating' },
        },
      };

      const stats = calculateGearStats(build, testCatalog);
      expect(stats.armorToughness).toBe(64);
      expect(stats.armor).toBe(25);
    });

    it('critério 2: modificador mul2 0,5 sobre durabilidade de armadura 660 resulta em 990', () => {
      const testCatalog: VersionCatalog = {
        ...catalog,
        materials: {
          ...catalog.materials,
          'test:durability_main': {
            id: 'test:durability_main',
            name: { en: 'Durability Main', pt: 'Main Durabilidade' },
            tier: 1,
            category: 'metal',
            color: '#ffffff',
            stats: {
              main: {
                armor_durability: 60, // 60 * 11 = 660 no capacete
              },
            },
            traits: {},
          },
          'test:mul2_coating': {
            id: 'test:mul2_coating',
            name: { en: 'Mul2 Coating', pt: 'Coating Mul2' },
            tier: 1,
            category: 'metal',
            color: '#aaaaaa',
            stats: {
              coating: {
                durability: { operation: 'MULTIPLY_TOTAL', value: 0.5 },
              },
            },
            traits: {},
          },
        },
      };

      const build: GearBuild = {
        gearTypeId: 'helmet',
        parts: {
          main: { materialId: 'test:durability_main' },
          coating: { materialId: 'test:mul2_coating' },
        },
      };

      const stats = calculateGearStats(build, testCatalog);
      expect(stats.durability).toBe(990);
    });

    it('slot secundário com magic_armor ADD soma à magic_armor do main', () => {
      const testCatalog: VersionCatalog = {
        ...catalog,
        materials: {
          ...catalog.materials,
          'test:magic_main': {
            id: 'test:magic_main',
            name: { en: 'Magic Main', pt: 'Main Mágico' },
            tier: 1,
            category: 'metal',
            color: '#ffffff',
            stats: {
              main: {
                magic_armor: 10,
              },
            },
            traits: {},
          },
          'test:magic_lining': {
            id: 'test:magic_lining',
            name: { en: 'Magic Lining', pt: 'Forro Mágico' },
            tier: 1,
            category: 'cloth',
            color: '#eeeeee',
            stats: {
              lining: {
                magic_armor: { operation: 'ADD', value: 5 },
              },
            },
            traits: {},
          },
        },
      };

      const build: GearBuild = {
        gearTypeId: 'chestplate',
        parts: {
          main: { materialId: 'test:magic_main' },
          lining: { materialId: 'test:magic_lining' },
        },
      };

      const stats = calculateGearStats(build, testCatalog);
      expect(stats.magicArmor).toBe(15);
    });

    it('knockback_resistance de slot secundário é somada e dividida por 10', () => {
      const testCatalog: VersionCatalog = {
        ...catalog,
        materials: {
          ...catalog.materials,
          'test:kb_main': {
            id: 'test:kb_main',
            name: { en: 'KB Main', pt: 'Main KB' },
            tier: 1,
            category: 'metal',
            color: '#ffffff',
            stats: {
              main: {
                armor: 10,
              },
            },
            traits: {},
          },
          'test:kb_coating': {
            id: 'test:kb_coating',
            name: { en: 'KB Coating', pt: 'Coating KB' },
            tier: 1,
            category: 'metal',
            color: '#aaaaaa',
            stats: {
              coating: {
                knockback_resistance: { operation: 'ADD', value: 1.0 },
              },
            },
            traits: {},
          },
        },
      };

      const build: GearBuild = {
        gearTypeId: 'chestplate',
        parts: {
          main: { materialId: 'test:kb_main' },
          coating: { materialId: 'test:kb_coating' },
        },
      };

      const stats = calculateGearStats(build, testCatalog);
      expect(stats.knockbackResistance).toBe(0.1);
    });

    it('aplica a ordem canônica do NumberProperty.compute (AVERAGE -> MAX -> MUL1 -> MUL2 -> ADD)', () => {
      // AVERAGE 60
      // MAX 70 -> vira 70
      // MUL1 0.1 -> 70 + 70*0.1 = 77
      // MUL2 0.2 -> 77 * 1.2 = 92.4
      // ADD 5 -> 92.4 + 5 = 97.4
      const result = computeNumberProperty(0, [
        { value: 60, operation: 'AVERAGE' },
        { value: 70, operation: 'MAX' },
        { value: 0.1, operation: 'MULTIPLY_BASE' },
        { value: 0.2, operation: 'MULTIPLY_TOTAL' },
        { value: 5, operation: 'ADD' },
      ]);
      expect(Number(result.toFixed(2))).toBe(97.4);
    });
  });

  describe('Issue #8: Suporte a materiais compostos (ligas e tecidos mistos)', () => {
    it('Critério 1: liga de dois materiais com armor 25 (primário) e 90 dá média ponderada (25·(1+25/26) + 90·(1+90/26)) / ((1+25/26) + (1+90/26)) ≈ 70,15 antes da sinergia', () => {
      const compressed = compressModifiersForProperty([
        { value: 25, operation: 'AVERAGE' },
        { value: 90, operation: 'AVERAGE' },
      ]);
      expect(compressed).toHaveLength(1);
      expect(compressed[0].operation).toBe('AVERAGE');
      expect(Number(compressed[0].value.toFixed(2))).toBe(70.15);
    });

    it('Critério 2: cinco materiais únicos todos com metal e endgame e rarity igual dão sinergia 1,1·5/6,1 + 1/2,1 + 2·0,015·5 ≈ 1,528', () => {
      const mockMats: Material[] = [
        {
          id: 'test:mat1',
          name: { en: 'Mat 1', pt: 'Mat 1' },
          tier: 4,
          category: 'metal',
          categories: ['metal', 'endgame'],
          color: '#111111',
          stats: { main: { rarity: 100 } },
          traits: {},
        },
        {
          id: 'test:mat2',
          name: { en: 'Mat 2', pt: 'Mat 2' },
          tier: 4,
          category: 'metal',
          categories: ['metal', 'endgame'],
          color: '#222222',
          stats: { main: { rarity: 100 } },
          traits: {},
        },
        {
          id: 'test:mat3',
          name: { en: 'Mat 3', pt: 'Mat 3' },
          tier: 4,
          category: 'metal',
          categories: ['metal', 'endgame'],
          color: '#333333',
          stats: { main: { rarity: 100 } },
          traits: {},
        },
        {
          id: 'test:mat4',
          name: { en: 'Mat 4', pt: 'Mat 4' },
          tier: 4,
          category: 'metal',
          categories: ['metal', 'endgame'],
          color: '#444444',
          stats: { main: { rarity: 100 } },
          traits: {},
        },
        {
          id: 'test:mat5',
          name: { en: 'Mat 5', pt: 'Mat 5' },
          tier: 4,
          category: 'metal',
          categories: ['metal', 'endgame'],
          color: '#555555',
          stats: { main: { rarity: 100 } },
          traits: {},
        },
      ];

      const synergy = calculateSynergy(mockMats, 'main');
      expect(Number(synergy.toFixed(3))).toBe(1.528);
    });

    it('Critério 3: reordenar os sub-materiais muda o resultado (o primário define o peso)', () => {
      // Ordem A -> B (25 primário, 90 secundário)
      const compressedAB = compressModifiersForProperty([
        { value: 25, operation: 'AVERAGE' },
        { value: 90, operation: 'AVERAGE' },
      ]);
      // Ordem B -> A (90 primário, 25 secundário)
      const compressedBA = compressModifiersForProperty([
        { value: 90, operation: 'AVERAGE' },
        { value: 25, operation: 'AVERAGE' },
      ]);

      expect(Number(compressedAB[0].value.toFixed(2))).toBe(70.15);
      expect(Number(compressedBA[0].value.toFixed(2))).toBe(64.61);
      expect(compressedAB[0].value).not.toBe(compressedBA[0].value);
    });

    it('Critério 4: teste de referência com a construção do save (exportada como fixture JSON)', () => {
      const fixturePath = path.resolve(__dirname, '../../tests/fixtures/reference_helmet_save.json');
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

      const build: GearBuild = {
        gearTypeId: fixture.gearTypeId,
        parts: fixture.parts,
      };

      const stats = calculateGearStats(build, ATM11_CATALOG);

      // A sinergia da liga quíntupla no main com casting em uru metal
      expect(stats.synergy).toBeGreaterThanOrEqual(140);
      expect(stats.armor).toBeGreaterThanOrEqual(25);
      expect(stats.armorToughness).toBeGreaterThanOrEqual(140);
      expect(stats.magicArmor).toBeGreaterThanOrEqual(850);

      // Traits acumuladas dos sub-materiais da liga e forro devem estar presentes
      const traitIds = stats.traits.map((t) => t.id);
      expect(traitIds).toContain('silentgear:indestructible');
    });
  });

  describe('Issue #9: Starlight Charger (starcharged)', () => {
    it('Critério de aceite 1: com c = 2, armor_durability 60 vira 72,6 (60 × 1,1²) e armor 15 vira 19', () => {
      // 1. Função pura applyStarcharge com c = 2 (nível 2, charging_value 1.0)
      const modifiedDurability = applyStarcharge(60, 'armor_durability', 2, 1.0, 'AVERAGE');
      expect(Number(modifiedDurability.toFixed(2))).toBe(72.6);

      const modifiedArmor = applyStarcharge(15, 'armor', 2, 1.0, 'AVERAGE');
      expect(modifiedArmor).toBe(19);

      // 2. Integração em calculateGearStats com material e build de teste
      const testCatalog: VersionCatalog = {
        ...catalog,
        materials: {
          ...catalog.materials,
          'test:starcharged_mat': {
            id: 'test:starcharged_mat',
            name: { en: 'Starcharged Test Mat', pt: 'Mat Teste Starcharge' },
            tier: 2,
            category: 'metal',
            color: '#55FFFF',
            stats: {
              main: {
                armor: 15,
                armor_durability: 60,
                charging_value: 1.0,
              },
            },
            traits: {},
          },
        },
      };

      const buildStarcharged: GearBuild = {
        gearTypeId: 'helmet',
        parts: {
          main: { materialId: 'test:starcharged_mat', starcharge: 2 },
        },
      };

      const stats = calculateGearStats(buildStarcharged, testCatalog);
      // Armor 15 vira 19
      expect(stats.armor).toBe(19);
      // Durabilidade de capacete: armor_durability vira 72.6, multiplicado por 11 (capacete) = 798.6 -> 799
      expect(stats.durability).toBe(799);
    });

    it('Critério de aceite 2: sem starcharge, os valores permanecem inalterados', () => {
      const testCatalog: VersionCatalog = {
        ...catalog,
        materials: {
          ...catalog.materials,
          'test:starcharged_mat': {
            id: 'test:starcharged_mat',
            name: { en: 'Starcharged Test Mat', pt: 'Mat Teste Starcharge' },
            tier: 2,
            category: 'metal',
            color: '#55FFFF',
            stats: {
              main: {
                armor: 15,
                armor_durability: 60,
                charging_value: 1.0,
              },
            },
            traits: {},
          },
        },
      };

      const buildNone: GearBuild = {
        gearTypeId: 'helmet',
        parts: {
          main: { materialId: 'test:starcharged_mat', starcharge: 0 },
        },
      };
      const buildUndefined: GearBuild = {
        gearTypeId: 'helmet',
        parts: {
          main: { materialId: 'test:starcharged_mat' },
        },
      };

      const statsNone = calculateGearStats(buildNone, testCatalog);
      const statsUndefined = calculateGearStats(buildUndefined, testCatalog);

      expect(statsNone.armor).toBe(15);
      expect(statsNone.durability).toBe(660); // 60 * 11
      expect(statsUndefined.armor).toBe(15);
      expect(statsUndefined.durability).toBe(660);
    });

    it('aplica corretamente as fórmulas de outras propriedades conforme StarchargedMaterialModifier.java', () => {
      // durability: valor * 1.25^c
      expect(applyStarcharge(100, 'durability', 2, 1.0, 'AVERAGE')).toBe(100 * 1.25 * 1.25);

      // harvest_speed: valor + 1.5 * level * c (para level=2, c=2: 6.0 + 1.5*2*2 = 12.0)
      expect(applyStarcharge(6.0, 'harvest_speed', 2, 1.0, 'AVERAGE')).toBe(12.0);

      // attack_damage / melee_damage: valor + c
      expect(applyStarcharge(5.0, 'melee_damage', 2, 1.0, 'ADD')).toBe(7.0);

      // ranged_damage: valor + c / 2
      expect(applyStarcharge(4.0, 'ranged_damage', 2, 1.0, 'ADD')).toBe(5.0);

      // armor_toughness: valor + 2c
      expect(applyStarcharge(10.0, 'armor_toughness', 2, 1.0, 'AVERAGE')).toBe(14.0);

      // magic_armor: valor + 2c
      expect(applyStarcharge(20.0, 'magic_armor', 2, 1.0, 'AVERAGE')).toBe(24.0);
    });

    it('aplica bônus de Grau primeiro e depois aplica Starcharge sobre o resultado graduado', () => {
      // Material com armor 10, charging_value 1.0.
      // Com Grade MAX (+30%): 10 * 1.30 = 13.0.
      // Com Starcharge II (c = 2): 13.0 + 2 * 2 = 17.0.
      const testCatalog: VersionCatalog = {
        ...catalog,
        materials: {
          ...catalog.materials,
          'test:combo_mat': {
            id: 'test:combo_mat',
            name: { en: 'Combo Mat', pt: 'Mat Combo' },
            tier: 2,
            category: 'metal',
            color: '#ffffff',
            stats: {
              main: {
                armor: 10,
                charging_value: 1.0,
              },
            },
            traits: {},
          },
        },
      };

      const build: GearBuild = {
        gearTypeId: 'helmet',
        parts: {
          main: { materialId: 'test:combo_mat', grade: 'MAX', starcharge: 2 },
        },
      };

      const stats = calculateGearStats(build, testCatalog);
      expect(stats.armor).toBe(17.0);
    });

    it('aplica Starcharge em slots secundários (ex: coating com Starcharge)', () => {
      const testCatalog: VersionCatalog = {
        ...catalog,
        materials: {
          ...catalog.materials,
          'test:main_mat': {
            id: 'test:main_mat',
            name: { en: 'Main Mat', pt: 'Mat Principal' },
            tier: 2,
            category: 'metal',
            color: '#ffffff',
            stats: {
              main: {
                armor: 10,
                armor_toughness: 5,
              },
            },
            traits: {},
          },
          'test:coating_mat': {
            id: 'test:coating_mat',
            name: { en: 'Coating Mat', pt: 'Mat Coating' },
            tier: 2,
            category: 'metal',
            color: '#aaaaaa',
            stats: {
              main: {
                charging_value: 1.5,
              },
              coating: {
                armor_toughness: 4,
              },
            },
            traits: {},
          },
        },
      };

      // Coating com starcharge 2: c = 2 * 1.5 = 3.0.
      // Toughness do coating: 4 + 2 * 3.0 = 10.
      // Toughness total: 5 (main) + 10 (coating) = 15.
      const build: GearBuild = {
        gearTypeId: 'chestplate',
        parts: {
          main: { materialId: 'test:main_mat' },
          coating: { materialId: 'test:coating_mat', starcharge: 2 },
        },
      };

      const stats = calculateGearStats(build, testCatalog);
      expect(stats.armorToughness).toBe(15.0);
    });

    it('não modifica operações multiplicativas (MULTIPLY_BASE, MULTIPLY_TOTAL)', () => {
      // Modificador com MULTIPLY_TOTAL deve ser preservado intacto por isSupportedModifierOp
      expect(applyStarcharge(0.2, 'durability', 3, 1.5, 'MULTIPLY_TOTAL')).toBe(0.2);
      expect(applyStarcharge(0.1, 'harvest_speed', 3, 1.5, 'MULTIPLY_BASE')).toBe(0.1);
    });
  });

  describe('Issue #26: Grau em ligas (nível da peça)', () => {
    it('Critério de aceite 1: liga de cinco metais com grade: MAX e starcharge: 3 na parte, no peitoral, resulta em armor 39.7 (±0.1)', () => {
      const build: GearBuild = {
        gearTypeId: 'chestplate',
        parts: {
          main: {
            materialId: 'silentgear:tyrian_steel',
            grade: 'MAX',
            starcharge: 3,
            materials: [
              { materialId: 'silentgear:tyrian_steel' },
              { materialId: 'silentgear:unobtainium' },
              { materialId: 'sgearmetalworks:uru_metal' },
              { materialId: 'silentgear:vibranium' },
              { materialId: 'silentgear:allthemodium' },
            ],
          },
        },
      };

      const stats = calculateGearStats(build, ATM11_CATALOG);
      expect(stats.armor).toBeCloseTo(39.7, 1);
    });

    it('Critério de aceite 2: grade nos sub-materiais (materials[i]) não altera nenhum stat', () => {
      const buildWithoutSubGrades: GearBuild = {
        gearTypeId: 'chestplate',
        parts: {
          main: {
            materialId: 'silentgear:tyrian_steel',
            grade: 'MAX',
            starcharge: 3,
            materials: [
              { materialId: 'silentgear:tyrian_steel' },
              { materialId: 'silentgear:unobtainium' },
              { materialId: 'sgearmetalworks:uru_metal' },
              { materialId: 'silentgear:vibranium' },
              { materialId: 'silentgear:allthemodium' },
            ],
          },
        },
      };

      const buildWithSubGrades: GearBuild = {
        gearTypeId: 'chestplate',
        parts: {
          main: {
            materialId: 'silentgear:tyrian_steel',
            grade: 'MAX',
            starcharge: 3,
            materials: [
              { materialId: 'silentgear:tyrian_steel', grade: 'D' },
              { materialId: 'silentgear:unobtainium', grade: 'C' },
              { materialId: 'sgearmetalworks:uru_metal', grade: 'B' },
              { materialId: 'silentgear:vibranium', grade: 'A' },
              { materialId: 'silentgear:allthemodium', grade: 'S' },
            ],
          },
        },
      };

      const statsWithout = calculateGearStats(buildWithoutSubGrades, ATM11_CATALOG);
      const statsWith = calculateGearStats(buildWithSubGrades, ATM11_CATALOG);

      expect(statsWith).toEqual(statsWithout);
    });
  });
});
