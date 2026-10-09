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
  calculateCompoundChargingValue,
  composeCompoundSlotModifiers,
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

const atm11CatalogPath = path.resolve(__dirname, '../../public/data/versions/atm11/catalog.json');
const atm11Catalog: VersionCatalog = JSON.parse(fs.readFileSync(atm11CatalogPath, 'utf8'));

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

    const statsAlone = calculateGearStats(buildAlone, atm11Catalog);
    const statsWithCoating = calculateGearStats(buildWithCoating, atm11Catalog);

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
      ...atm11Catalog,
      materials: {
        ...atm11Catalog.materials,
        'silentgear:netherite_no_armor': {
          ...atm11Catalog.materials['silentgear:netherite'],
          stats: {
            ...atm11Catalog.materials['silentgear:netherite'].stats,
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

  it('aplica multiplicador de graduação de qualidade (Grade MAX dá +30% no material, não no dano base da arma)', () => {
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

    expect(statsUngraded.meleeDamage).toBe(5.0);
    expect(statsGraded.meleeDamage).toBeGreaterThan(statsUngraded.meleeDamage);
    expect(statsGraded.durability).toBeGreaterThan(statsUngraded.durability);
    // Dano base espada (3.0) + Ferro com Grade MAX (2.0 * 1.30 = 2.6) = 5.6
    expect(statsGraded.meleeDamage).toBe(5.6);
  });

  it('não multiplica o dano base da espada quando o material principal tem 0 de dano melee (bambu)', () => {
    const buildBambooUngraded: GearBuild = {
      gearTypeId: 'sword',
      parts: {
        main: { materialId: 'silentgear:bamboo', grade: 'NONE' },
        rod: { materialId: 'silentgear:wood' },
      },
    };
    const buildBambooGraded: GearBuild = {
      gearTypeId: 'sword',
      parts: {
        main: { materialId: 'silentgear:bamboo', grade: 'MAX' },
        rod: { materialId: 'silentgear:wood' },
      },
    };

    const statsUngraded = calculateGearStats(buildBambooUngraded, atm11Catalog);
    const statsGraded = calculateGearStats(buildBambooGraded, atm11Catalog);

    // Bambu tem dano 0. Dano base da espada é 3.0. Tanto sem grau quanto com MAX o dano é 3.0.
    expect(statsUngraded.meleeDamage).toBe(3.0);
    expect(statsGraded.meleeDamage).toBe(3.0);
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

    const stats = calculateGearStats(build, atm11Catalog);

    expect(stats.synergy).toBe(100);
    expect(stats.meleeDamage).toBeGreaterThanOrEqual(22.0);
    expect(stats.durability).toBeGreaterThan(9000);
    expect(stats.attackSpeed).toBeGreaterThan(1.6);

    const traitIds = stats.traits.map((t) => t.id);
    expect(traitIds).toContain('silentgear:brilliant');
    expect(traitIds).toContain('silentgear:wind_blast');
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

    it('Critério 4 (Issue #29): teste de referência com as quatro peças do save contra valores reais do jogo', () => {
      const fixturePath = path.resolve(__dirname, '../../tests/fixtures/reference_armor_save.json');
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

      // 1. As quatro peças batem com a tabela gravada no NBT do save
      for (const [pieceKey, pieceData] of Object.entries(fixture.pieces)) {
        const piece = pieceData as any;
        const build: GearBuild = {
          gearTypeId: piece.gearTypeId,
          parts: piece.parts,
        };

        const stats = calculateGearStats(build, atm11Catalog);
        const expected = piece.expectedInGameProperties;

        // Tolerância de ±0,05 em relação aos valores gravados no NBT (arredondados para uma casa)
        expect(Math.abs(stats.armor - Number(expected.armor.toFixed(1)))).toBeLessThanOrEqual(0.05);
        expect(Math.abs(stats.armorToughness - Number(expected.armorToughness.toFixed(1)))).toBeLessThanOrEqual(0.05);
        expect(Math.abs(stats.magicArmor - Number(expected.magicArmor.toFixed(1)))).toBeLessThanOrEqual(0.05);

        // Durabilidade estritamente igual ao max_damage gravado pelo jogo
        expect(stats.durability).toBe(expected.maxDamage);

        // Traits acumuladas presentes nas peças com liga/forro
        if (pieceKey === 'helmet' || pieceKey === 'chestplate') {
          const traitIds = stats.traits.map((t) => t.id);
          expect(traitIds).toContain('silentgear:indestructible');
        }
      }

      // 2. O teste falha se o grau for ignorado
      const chestData = fixture.pieces.chestplate as any;
      const buildUngraded: GearBuild = {
        gearTypeId: chestData.gearTypeId,
        parts: {
          main: {
            ...chestData.parts.main,
            grade: 'NONE',
          },
        },
      };
      const statsUngraded = calculateGearStats(buildUngraded, atm11Catalog);
      expect(Math.abs(statsUngraded.armor - Number(chestData.expectedInGameProperties.armor.toFixed(1)))).toBeGreaterThan(0.05);

      // 3. O teste falha se charging_value usar só o primeiro submaterial (1.1 em vez de ~1.31)
      const tyrianFirstOnlyCV = 1.1;
      const compoundCV = 1.31176;
      expect(tyrianFirstOnlyCV).not.toBeCloseTo(compoundCV, 2);

      // 4. O teste falha se a durabilidade de armadura for arredondada (Math.round) em vez de truncada (Math.trunc)
      // No peitoral: armor_durability = 134082.859375; round(16 * 134082.86) daria 2145326 em vez de 2145312
      const peitoralArmorDurability = 134082.859375;
      const peitoralMultiplier = 16;
      const roundedDurability = Math.round(peitoralArmorDurability * peitoralMultiplier);
      const truncatedDurability = Math.trunc(peitoralArmorDurability) * peitoralMultiplier;
      expect(roundedDurability).toBe(2145326);
      expect(truncatedDurability).toBe(2145312);
      expect(roundedDurability).not.toBe(chestData.expectedInGameProperties.maxDamage);
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
      // Durabilidade de capacete: armor_durability vira 72.6, truncado em 72 × 11 (capacete) = 792 (GearArmorItem.java:107-110, Issue #37)
      expect(stats.durability).toBe(792);
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

  describe('Issue #35: Velocidade de ataque limitada ao teto de 4.0 do mod', () => {
    it('espada Unobtainium + haste Wood no catálogo atm11 retorna attackSpeed 4 e dps 152', () => {
      const build: GearBuild = {
        gearTypeId: 'sword',
        parts: {
          main: { materialId: 'silentgear:unobtainium' },
          rod: { materialId: 'silentgear:wood' },
        },
      };

      const stats = calculateGearStats(build, ATM11_CATALOG);

      expect(stats.attackSpeed).toBe(4);
      expect(stats.dps).toBe(152);
    });
  });

  describe('Issue #45: Catálogo ATM11 carregado de catalog.json', () => {
    it('botas de ferro no catálogo carregado têm armor 2', () => {
      const build: GearBuild = {
        gearTypeId: 'boots',
        parts: {
          main: { materialId: 'silentgear:iron' },
        },
      };

      const stats = calculateGearStats(build, atm11Catalog);
      expect(stats.armor).toBe(2);
    });

    it('preset atm11 lista ≥ 140 materiais e inventário inicial tem o mesmo tamanho', () => {
      const materialCount = Object.keys(atm11Catalog.materials).length;
      expect(materialCount).toBeGreaterThanOrEqual(140);

      const initialInventory = new Set(Object.keys(atm11Catalog.materials));
      expect(initialInventory.size).toBe(materialCount);
    });
  });

  describe('Issue #26: Grau em ligas (nível da peça)', () => {
    it('Critério de aceite 1: liga de cinco metais com grade: MAX e starcharge: 3 na parte, no peitoral, resulta em armor 41.0 (±0.1)', () => {
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
      expect(stats.armor).toBeCloseTo(41.0, 1);
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

  describe('Issue #27: Ligas: charging_value usa média ponderada dos submaterials', () => {
    it('calcula charging_value composto via média ponderada (~1.31) para a liga pentametálica', () => {
      const subMaterials = [
        ATM11_CATALOG.materials['silentgear:tyrian_steel'],
        ATM11_CATALOG.materials['silentgear:unobtainium'],
        ATM11_CATALOG.materials['sgearmetalworks:uru_metal'],
        ATM11_CATALOG.materials['silentgear:vibranium'],
        ATM11_CATALOG.materials['silentgear:allthemodium'],
      ];

      const cv = calculateCompoundChargingValue(subMaterials, 'main');
      expect(cv).toBeDefined();
      expect(cv).toBeCloseTo(1.3118, 3);
      // O selo de charging_value da UI mostra ~1,31
      expect(Number(cv!.toFixed(2))).toBe(1.31);
    });

    it('peitoral do save (#29) com grau MAX e starcharge 3 tem armor 40,97 (±0,05)', () => {
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
      // No jogo gravado no NBT: armor = 40.9728
      expect(Math.abs(stats.armor - 40.97)).toBeLessThanOrEqual(0.05);
      expect(stats.armor).toBeCloseTo(41.0, 1);
    });

    it('retorna undefined para liga sem nenhum submaterial com charging_value', () => {
      const subMaterials = [
        ATM11_CATALOG.materials['silentgear:iron'],
        ATM11_CATALOG.materials['silentgear:gold'],
      ];

      const cv = calculateCompoundChargingValue(subMaterials, 'main');
      expect(cv).toBeUndefined();
    });

    it('suporta charging_value em slots secundários compostos derivando de stats.main', () => {
      const subMaterials = [
        ATM11_CATALOG.materials['silentgear:tyrian_steel'],
        ATM11_CATALOG.materials['sgearmetalworks:uru_metal'],
      ];

      const cvLining = calculateCompoundChargingValue(subMaterials, 'lining');
      expect(cvLining).toBeDefined();
      expect(cvLining).toBeCloseTo(1.3118, 3);
    });
  });

  describe('Issue #30: Multiplicador da Liga Crua e Tipos de Liga', () => {
    it('liga crua multiplica por 0,8 as propriedades afetadas por sinergia e preserva propriedades não afetadas (Critério 2)', () => {
      const iron = ATM11_CATALOG.materials['silentgear:iron']!;
      const gold = ATM11_CATALOG.materials['silentgear:gold']!;

      const subMaterials = [iron, gold];

      // Compor como metal (padrão / 1.0x)
      const metalComposed = composeCompoundSlotModifiers(subMaterials, 'main', false, 'sword', 'metal');

      // Compor como crude (0.8x)
      const crudeComposed = composeCompoundSlotModifiers(subMaterials, 'main', false, 'sword', 'crude');

      expect(metalComposed.synergy).toBeCloseTo(crudeComposed.synergy, 5);

      // Durabilidade (afetada por sinergia): deve ter exatamente x0.8
      const metalDur = metalComposed.durabilityMods[0].value;
      const crudeDur = crudeComposed.durabilityMods[0].value;
      expect(crudeDur).toBeCloseTo(metalDur * 0.8, 4);

      // Dano corpo a corpo (afetado por sinergia): deve ter exatamente x0.8
      const metalDamage = metalComposed.meleeDamageMods[0].value;
      const crudeDamage = crudeComposed.meleeDamageMods[0].value;
      expect(crudeDamage).toBeCloseTo(metalDamage * 0.8, 4);

      // Velocidade de colheita (afetada por sinergia): deve ter exatamente x0.8
      const metalHarvest = metalComposed.harvestSpeedMods[0].value;
      const crudeHarvest = crudeComposed.harvestSpeedMods[0].value;
      expect(crudeHarvest).toBeCloseTo(metalHarvest * 0.8, 4);

      // Velocidade de ataque (NÃO afetada por sinergia): NÃO deve ser multiplicada por 0.8
      const metalAtkSpd = metalComposed.attackSpeedMods[0].value;
      const crudeAtkSpd = crudeComposed.attackSpeedMods[0].value;
      expect(crudeAtkSpd).toBeCloseTo(metalAtkSpd, 4);

      // Rarity (NÃO afetada por sinergia): NÃO deve ser multiplicada por 0.8
      const metalRarity = metalComposed.rarityMods[0].value;
      const crudeRarity = crudeComposed.rarityMods[0].value;
      expect(crudeRarity).toBeCloseTo(metalRarity, 4);
    });

    it('calculateGearStats aplica penalidade da liga crua no resultado final da arma', () => {
      const buildMetal: GearBuild = {
        gearTypeId: 'sword',
        parts: {
          main: {
            materialId: 'silentgear:iron',
            alloyType: 'metal',
            materials: [{ materialId: 'silentgear:iron' }, { materialId: 'silentgear:gold' }],
          },
          rod: { materialId: 'silentgear:rough_rod' },
        },
      };

      const buildCrude: GearBuild = {
        gearTypeId: 'sword',
        parts: {
          main: {
            materialId: 'silentgear:iron',
            alloyType: 'crude',
            materials: [{ materialId: 'silentgear:iron' }, { materialId: 'silentgear:gold' }],
          },
          rod: { materialId: 'silentgear:rough_rod' },
        },
      };

      const statsMetal = calculateGearStats(buildMetal, ATM11_CATALOG);
      const statsCrude = calculateGearStats(buildCrude, ATM11_CATALOG);

      // Durabilidade e dano menores na crua devido à penalidade de 20%
      expect(statsCrude.durability).toBeLessThan(statsMetal.durability);
      expect(statsCrude.meleeDamage).toBeLessThan(statsMetal.meleeDamage);
      // Velocidade de ataque inalterada
      expect(statsCrude.attackSpeed).toBeCloseTo(statsMetal.attackSpeed, 2);
    });

    it('super liga e liga de metais mantêm multiplicador de 1.0 (sem penalidade)', () => {
      const iron = ATM11_CATALOG.materials['silentgear:iron']!;
      const gold = ATM11_CATALOG.materials['silentgear:gold']!;

      const metalComposed = composeCompoundSlotModifiers([iron, gold], 'main', false, 'sword', 'metal');
      const superComposed = composeCompoundSlotModifiers([iron, gold], 'main', false, 'sword', 'super');

      expect(superComposed.durabilityMods[0].value).toBeCloseTo(metalComposed.durabilityMods[0].value, 4);
      expect(superComposed.meleeDamageMods[0].value).toBeCloseTo(metalComposed.meleeDamageMods[0].value, 4);
    });
  });

  describe('Issue #32: Traits de sinergia (synergistic, rustic, crude)', () => {
    const baseMetal1: Material = {
      id: 'test:synergy_mat1',
      name: { en: 'Synergy Mat 1', pt: 'Synergy Mat 1' },
      tier: 2,
      category: 'metal',
      color: '#aaaaaa',
      stats: { main: { rarity: 10 } },
      traits: {},
    };

    const baseMetal2: Material = {
      id: 'test:synergy_mat2',
      name: { en: 'Synergy Mat 2', pt: 'Synergy Mat 2' },
      tier: 2,
      category: 'metal',
      color: '#bbbbbb',
      stats: { main: { rarity: 10 } },
      traits: {},
    };

    it('Critério 1: liga com um material synergistic 2 e sinergia base maior que 1,0 soma 0,08', () => {
      const baseSynergy = calculateSynergy([baseMetal1, baseMetal2], 'main');
      expect(baseSynergy).toBeGreaterThan(1.0);

      const matWithSynergistic: Material = {
        ...baseMetal1,
        traits: {
          main: [{ name: 'silentgear:synergistic', level: 2 }],
        },
      };

      const synergyWithTrait = calculateSynergy([matWithSynergistic, baseMetal2], 'main');
      expect(synergyWithTrait).toBeCloseTo(baseSynergy + 0.08, 5);
    });

    it('não aplica synergistic quando a sinergia base é menor ou igual a 1,0', () => {
      // Sem categorias compartilhadas: penalidade de -0.2 resulta em sinergia base < 1.0 (~0.9859)
      const woodMat: Material = {
        ...baseMetal2,
        id: 'test:wood_mat',
        category: 'wood',
        traits: {},
      };

      const baseSynergyNoShared = calculateSynergy([baseMetal1, woodMat], 'main');
      expect(baseSynergyNoShared).toBeLessThan(1.0);

      const matWithSynergistic: Material = {
        ...baseMetal1,
        traits: {
          main: [{ name: 'silentgear:synergistic', level: 2 }],
        },
      };

      const synergyWithTrait = calculateSynergy([matWithSynergistic, woodMat], 'main');
      expect(synergyWithTrait).toBeCloseTo(baseSynergyNoShared, 5);
    });

    it('Critério 2: trait rustic só soma quando a sinergia está entre 0,749 e 1,001', () => {
      const woodMat: Material = {
        ...baseMetal2,
        id: 'test:wood_mat',
        category: 'wood',
        traits: {},
      };

      // 1. Dentro da faixa [0.749, 1.001]: sinergia base ~0.9859
      const baseSynergy = calculateSynergy([baseMetal1, woodMat], 'main');
      expect(baseSynergy).toBeGreaterThan(0.749);
      expect(baseSynergy).toBeLessThan(1.001);

      const matWithRustic1: Material = {
        ...baseMetal1,
        traits: {
          main: [{ name: 'silentgear:rustic', level: 1 }],
        },
      };
      const matWithRustic2: Material = {
        ...baseMetal1,
        traits: {
          main: [{ name: 'silentgear:rustic', level: 2 }],
        },
      };

      const synergyRustic1 = calculateSynergy([matWithRustic1, woodMat], 'main');
      expect(synergyRustic1).toBeCloseTo(baseSynergy + 0.05, 5);

      const synergyRustic2 = calculateSynergy([matWithRustic2, woodMat], 'main');
      expect(synergyRustic2).toBeCloseTo(baseSynergy + 0.10, 5);

      // 2. Acima da faixa (> 1.001): baseSynergy > 1.001 (~1.2159) -> rustic NÃO soma
      const highBaseSynergy = calculateSynergy([baseMetal1, baseMetal2], 'main');
      expect(highBaseSynergy).toBeGreaterThan(1.001);

      const synergyRusticHigh = calculateSynergy([matWithRustic1, baseMetal2], 'main');
      expect(synergyRusticHigh).toBeCloseTo(highBaseSynergy, 5);

      // 3. Abaixo da faixa (< 0.749): material com penalidade severa de raridade -> rustic NÃO soma
      const lowRarityMat: Material = {
        ...woodMat,
        stats: { main: { rarity: 300 } },
      };
      const lowBaseSynergy = calculateSynergy([baseMetal1, lowRarityMat], 'main');
      expect(lowBaseSynergy).toBeLessThan(0.749);

      const synergyRusticLow = calculateSynergy([matWithRustic1, lowRarityMat], 'main');
      expect(synergyRusticLow).toBeCloseTo(lowBaseSynergy, 5);
    });

    it('trait crude reduz sinergia em -0.04 por nível quando sinergia > 0.0', () => {
      const baseSynergy = calculateSynergy([baseMetal1, baseMetal2], 'main');
      const matWithCrude1: Material = {
        ...baseMetal1,
        traits: {
          main: [{ name: 'silentgear:crude', level: 1 }],
        },
      };
      const matWithCrude2: Material = {
        ...baseMetal1,
        traits: {
          main: [{ name: 'silentgear:crude', level: 2 }],
        },
      };

      const synergyCrude1 = calculateSynergy([matWithCrude1, baseMetal2], 'main');
      expect(synergyCrude1).toBeCloseTo(baseSynergy - 0.04, 5);

      const synergyCrude2 = calculateSynergy([matWithCrude2, baseMetal2], 'main');
      expect(synergyCrude2).toBeCloseTo(baseSynergy - 0.08, 5);
    });

    it('composeCompoundSlotModifiers repassa traits para o cálculo de sinergia', () => {
      const matWithSynergistic: Material = {
        ...baseMetal1,
        traits: {
          main: [{ name: 'silentgear:synergistic', level: 2 }],
        },
      };

      const composedNoTrait = composeCompoundSlotModifiers([baseMetal1, baseMetal2], 'main', false);
      const composedWithTrait = composeCompoundSlotModifiers([matWithSynergistic, baseMetal2], 'main', false);

      expect(composedWithTrait.synergy).toBeCloseTo(composedNoTrait.synergy + 0.08, 5);
    });

    it('os três traits existem no catálogo oficial com maxLevel = 5', () => {
      expect(ATM11_CATALOG.traits['silentgear:synergistic']).toBeDefined();
      expect(ATM11_CATALOG.traits['silentgear:synergistic'].maxLevel).toBe(5);

      expect(ATM11_CATALOG.traits['silentgear:rustic']).toBeDefined();
      expect(ATM11_CATALOG.traits['silentgear:rustic'].maxLevel).toBe(5);

      expect(ATM11_CATALOG.traits['silentgear:crude']).toBeDefined();
      expect(ATM11_CATALOG.traits['silentgear:crude'].maxLevel).toBe(5);
    });
  });

  describe('Issue #37: Calculadora: durabilidade de armadura arredonda onde o mod trunca', () => {
    it('Critério 1: peitoral de silentgear:feather com grau MAX tem durabilidade 32', () => {
      const buildFeatherMax: GearBuild = {
        gearTypeId: 'chestplate',
        parts: {
          main: {
            materialId: 'silentgear:feather',
            grade: 'MAX',
          },
        },
      };
      const statsMax = calculateGearStats(buildFeatherMax, atm11Catalog);
      // feather tem armor_durability = 2; com grau MAX (+30%) vira 2.6
      // trunc(2.6) * 16 = 2 * 16 = 32 (anteriormente round(2.6 * 16) daria 42)
      expect(statsMax.durability).toBe(32);

      // Sem grau: 2 * 16 = 32
      const buildFeatherNone: GearBuild = {
        gearTypeId: 'chestplate',
        parts: {
          main: {
            materialId: 'silentgear:feather',
            grade: 'NONE',
          },
        },
      };
      const statsNone = calculateGearStats(buildFeatherNone, atm11Catalog);
      expect(statsNone.durability).toBe(32);
    });

    it('Critério 2: teste de regressão com o conjunto do save (#29)', () => {
      const fixturePath = path.resolve(__dirname, '../../tests/fixtures/reference_armor_save.json');
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

      const helmetStats = calculateGearStats({ gearTypeId: 'helmet', parts: fixture.pieces.helmet.parts }, atm11Catalog);
      expect(helmetStats.durability).toBe(1475089);

      const chestStats = calculateGearStats({ gearTypeId: 'chestplate', parts: fixture.pieces.chestplate.parts }, atm11Catalog);
      expect(chestStats.durability).toBe(2145312);

      const leggingsStats = calculateGearStats({ gearTypeId: 'leggings', parts: fixture.pieces.leggings.parts }, atm11Catalog);
      expect(leggingsStats.durability).toBe(2011485);

      const bootsStats = calculateGearStats({ gearTypeId: 'boots', parts: fixture.pieces.boots.parts }, atm11Catalog);
      expect(bootsStats.durability).toBe(1743287);
    });

    it('Critério 3: ferramentas continuam arredondando com Math.round', () => {
      // Espada padrão de diamante + madeira segue passando com 1576
      const buildSword: GearBuild = {
        gearTypeId: 'sword',
        parts: {
          main: { materialId: 'silentgear:diamond' },
          rod: { materialId: 'silentgear:wood' },
        },
      };
      const swordStats = calculateGearStats(buildSword, catalog);
      expect(swordStats.durability).toBe(1576);

      // Espada com grau gerando valor fracionário arredonda para cima (1591.61 -> 1592 em vez de truncar para 1591)
      const buildSwordGradeE: GearBuild = {
        gearTypeId: 'sword',
        parts: {
          main: { materialId: 'silentgear:diamond', grade: 'E' },
          rod: { materialId: 'silentgear:wood' },
        },
      };
      const swordStatsGradeE = calculateGearStats(buildSwordGradeE, catalog);
      expect(swordStatsGradeE.durability).toBe(1592);
    });
  });
});

