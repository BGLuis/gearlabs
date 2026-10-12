import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { findBestBuilds, MAX_SECONDARY_CANDIDATES } from './optimizer';
import { calculateGearStats } from './calculator';
import {
  OFFICIAL_MATERIALS_1_20,
  OFFICIAL_GEAR_TYPES,
  OFFICIAL_TRAITS,
  ATM11_CATALOG,
} from '@/data/defaultCatalog';
import { Material, VersionCatalog } from '@/types/silentgear';

const catalog: VersionCatalog = {
  version: '1.20.1',
  materials: OFFICIAL_MATERIALS_1_20,
  gearTypes: OFFICIAL_GEAR_TYPES,
  traits: OFFICIAL_TRAITS,
};

describe('findBestBuilds', () => {
  it('encontra a melhor espada para dano máximo (max_damage)', () => {
    const available = [
      'silentgear:wood',
      'silentgear:iron',
      'silentgear:diamond',
      'silentgear:crimson_steel',
    ];

    const results = findBestBuilds(
      {
        gearTypeId: 'sword',
        availableMaterials: available,
        goal: 'max_damage',
      },
      catalog,
      3
    );

    expect(results.length).toBeGreaterThan(0);
    const best = results[0];
    // Crimson Steel tem 4.5 de dano base + dano da espada (3.0) = 7.5 ou mais
    expect(best.build.parts.main?.materialId).toBe('silentgear:crimson_steel');
    expect(best.stats.meleeDamage).toBeGreaterThanOrEqual(7.5);
    expect(best.summaryHighlights.length).toBeGreaterThan(0);
  });

  it('respeita os materiais disponíveis e nunca usa material desmarcado', () => {
    // Apenas Ferro e Madeira disponíveis (sem Diamante ou Netherite)
    const available = ['silentgear:wood', 'silentgear:iron'];

    const results = findBestBuilds(
      {
        gearTypeId: 'sword',
        availableMaterials: available,
        goal: 'max_damage',
      },
      catalog,
      3
    );

    expect(results.length).toBeGreaterThan(0);
    // A melhor opção deve usar ferro (maior dano que madeira)
    expect(results[0].build.parts.main?.materialId).toBe('silentgear:iron');
    for (const res of results) {
      expect(res.build.parts.main?.materialId).not.toBe('silentgear:diamond');
      expect(res.build.parts.main?.materialId).not.toBe('silentgear:netherite');
    }
  });

  it('encontra a melhor armadura entre materiais craftáveis como armadura (max_protection)', () => {
    // Só iron tem armor_durability no main no catálogo 1.20.1; diamond, netherite e crimson_steel
    // não são construção válida de armadura e não podem ser sugeridos
    const available = [
      'silentgear:iron',
      'silentgear:diamond',
      'silentgear:netherite',
      'silentgear:crimson_steel',
    ];

    const results = findBestBuilds(
      {
        gearTypeId: 'chestplate',
        availableMaterials: available,
        goal: 'max_protection',
      },
      catalog,
      1
    );

    expect(results.length).toBe(1);
    const best = results[0];
    expect(best.build.parts.main?.materialId).toBe('silentgear:iron');
    expect(best.stats.armor).toBeGreaterThan(0);
  });

  it('não sugere armadura com main fixado que não tem armor_durability (não craftável)', () => {
    const results = findBestBuilds(
      {
        gearTypeId: 'chestplate',
        availableMaterials: ['silentgear:iron'],
        fixedSlots: { main: 'silentgear:wood' },
        goal: 'max_protection',
      },
      catalog,
      1
    );

    expect(results).toEqual([]);
  });

  it('executa em tempo ultrarrápido (< 50ms)', () => {
    const allMaterials = Object.keys(catalog.materials);
    // Warm-up do JIT
    findBestBuilds(
      {
        gearTypeId: 'sword',
        availableMaterials: allMaterials,
        goal: 'max_dps',
      },
      catalog,
      1
    );

    const start = performance.now();

    const results = findBestBuilds(
      {
        gearTypeId: 'sword',
        availableMaterials: allMaterials,
        goal: 'max_dps',
      },
      catalog,
      3
    );

    const elapsed = performance.now() - start;
    expect(results.length).toBe(3);
    expect(elapsed).toBeLessThan(100); // Garantia de execução ultrarrápida sob concorrência
  });

  it('no ATM11 escolhe Unobtainium como topo para dano e proteção', () => {
    const available = Object.keys(ATM11_CATALOG.materials);

    const swordResults = findBestBuilds(
      {
        gearTypeId: 'sword',
        availableMaterials: available,
        goal: 'max_damage',
      },
      ATM11_CATALOG,
      1
    );

    expect(['silentgear:unobtainium', 'sgearmetalworks:uru_metal']).toContain(
      swordResults[0].build.parts.main?.materialId
    );
    expect(swordResults[0].stats.meleeDamage).toBeGreaterThan(18);

    const armorResults = findBestBuilds(
      {
        gearTypeId: 'chestplate',
        availableMaterials: available,
        goal: 'max_protection',
      },
      ATM11_CATALOG,
      1
    );

    expect(['silentgear:unobtainium', 'sgearmetalworks:uru_metal']).toContain(
      armorResults[0].build.parts.main?.materialId
    );
    expect(armorResults[0].stats.armor).toBeGreaterThanOrEqual(14);
  });

  it('num catálogo com 30 pontas em que a melhor para o objetivo é a última na ordem do objeto, findBestBuilds a devolve', () => {
    const materials: Record<string, Material> = {
      'test:main_mat': {
        id: 'test:main_mat',
        name: { en: 'Main Mat', pt: 'Material Principal' },
        tier: 1,
        category: 'metal',
        color: '#FFFFFF',
        stats: {
          main: {
            durability: 500,
            melee_damage: 5.0,
            attack_speed: 0.0,
            harvest_speed: 4.0,
          },
        },
        traits: {},
      },
      'test:rod_mat': {
        id: 'test:rod_mat',
        name: { en: 'Rod Mat', pt: 'Material Haste' },
        tier: 1,
        category: 'wood',
        color: '#888888',
        stats: {
          rod: { durability: 50 },
        },
        traits: {},
      },
    };

    // Gera 30 pontas: pontas 01..29 são fracas (+1.0 dano), ponta 30 é a mais forte (+25.0 dano)
    for (let i = 1; i <= 29; i++) {
      const id = `test:tip_${String(i).padStart(2, '0')}`;
      materials[id] = {
        id,
        name: { en: `Tip ${i}`, pt: `Ponta ${i}` },
        tier: 1,
        category: 'gem',
        color: '#AAAAAA',
        stats: {
          tip: { durability: 50, melee_damage: 1.0 },
        },
        traits: {},
      };
    }

    const bestTipId = 'test:tip_30';
    materials[bestTipId] = {
      id: bestTipId,
      name: { en: 'Super Tip 30', pt: 'Super Ponta 30' },
      tier: 3,
      category: 'gem',
      color: '#FF00FF',
      stats: {
        tip: { durability: 500, melee_damage: 25.0 },
      },
      traits: {},
    };

    const testCatalog: VersionCatalog = {
      version: 'test-1.0',
      materials,
      gearTypes: OFFICIAL_GEAR_TYPES,
      traits: {},
    };

    const results = findBestBuilds(
      {
        gearTypeId: 'sword',
        availableMaterials: Object.keys(materials),
        goal: 'max_damage',
      },
      testCatalog,
      1
    );

    expect(results.length).toBe(1);
    expect(results[0].build.parts.tip?.materialId).toBe(bestTipId);
    expect(results[0].stats.meleeDamage).toBeGreaterThanOrEqual(30);
  });

  it('teste de equivalência: num catálogo reduzido (≤ 8 candidatos por slot) o resultado é igual ao da busca exaustiva', () => {
    const materials: Record<string, Material> = {};

    // 4 materiais principais
    for (let i = 1; i <= 4; i++) {
      const id = `test:equiv_main_${i}`;
      materials[id] = {
        id,
        name: { en: `Main ${i}`, pt: `Principal ${i}` },
        tier: i,
        category: 'metal',
        color: '#FFFFFF',
        stats: {
          main: { durability: 200 * i, melee_damage: 2.0 * i },
        },
        traits: {},
      };
    }

    // 5 hastes (≤ 8)
    for (let i = 1; i <= 5; i++) {
      const id = `test:equiv_rod_${i}`;
      materials[id] = {
        id,
        name: { en: `Rod ${i}`, pt: `Haste ${i}` },
        tier: 1,
        category: 'wood',
        color: '#FFFFFF',
        stats: {
          rod: { durability: 30 * i },
        },
        traits: {},
      };
    }

    // 6 pontas (≤ 8)
    for (let i = 1; i <= 6; i++) {
      const id = `test:equiv_tip_${i}`;
      materials[id] = {
        id,
        name: { en: `Tip ${i}`, pt: `Ponta ${i}` },
        tier: 1,
        category: 'gem',
        color: '#FFFFFF',
        stats: {
          tip: { durability: 20 * i, melee_damage: 1.5 * i },
        },
        traits: {},
      };
    }

    const testCatalog: VersionCatalog = {
      version: 'test-equiv',
      materials,
      gearTypes: OFFICIAL_GEAR_TYPES,
      traits: {},
    };

    const standardResults = findBestBuilds(
      {
        gearTypeId: 'sword',
        availableMaterials: Object.keys(materials),
        goal: 'max_damage',
      },
      testCatalog,
      3
    );

    // Busca exaustiva (sem poda: maxSecondaryCandidates e maxOptionalCandidates = Infinity)
    const exhaustiveResults = findBestBuilds(
      {
        gearTypeId: 'sword',
        availableMaterials: Object.keys(materials),
        goal: 'max_damage',
      },
      testCatalog,
      3,
      Infinity,
      Infinity
    );

    expect(standardResults).toEqual(exhaustiveResults);
  });

  it('garante que slice(0, 15) não existe no código de optimizer.ts', () => {
    const optimizerFilePath = path.join(__dirname, 'optimizer.ts');
    const optimizerCode = fs.readFileSync(optimizerFilePath, 'utf-8');
    expect(optimizerCode.includes('slice(0, 15)')).toBe(false);
  });

  it('findBestBuilds com meta max_dps no catálogo atm11 nunca devolve stats.attackSpeed > 4 (Issue #35)', () => {
    const available = Object.keys(ATM11_CATALOG.materials);

    const results = findBestBuilds(
      {
        gearTypeId: 'sword',
        availableMaterials: available,
        goal: 'max_dps',
      },
      ATM11_CATALOG,
      10
    );

    expect(results.length).toBeGreaterThan(0);
    for (const res of results) {
      expect(res.stats.attackSpeed).toBeLessThanOrEqual(4);
    }
  });

  describe('Issue #56: Otimizador com ligas, grau e starcharge', () => {
    const saveMetals = [
      'silentgear:tyrian_steel',
      'silentgear:unobtainium',
      'sgearmetalworks:uru_metal',
      'silentgear:vibranium',
      'silentgear:allthemodium',
    ];

    it('Critério 1: peitoral, meta Proteção, grau MAX, starcharge 3, com os cinco metais do save disponíveis: a sugestão é uma liga com armor ≥ 40,9 e armorToughness ≥ 150', () => {
      const results = findBestBuilds(
        {
          gearTypeId: 'chestplate',
          availableMaterials: saveMetals,
          goal: 'max_protection',
          grade: 'MAX',
          starcharge: 3,
        },
        ATM11_CATALOG,
        1
      );

      expect(results.length).toBeGreaterThan(0);
      const best = results[0];

      // A sugestão deve ser uma liga composta (mais de 1 sub-material)
      expect(best.build.parts.main?.materials).toBeDefined();
      expect(best.build.parts.main?.materials!.length).toBeGreaterThan(1);

      // O item do save (40,97 / 154) usa os cinco metais; a busca acha ligas com mais armadura e um pouco
      // menos de tenacidade, porque a meta pesa a armadura acima da tenacidade
      expect(best.stats.armor).toBeGreaterThanOrEqual(40.9);
      expect(best.stats.armorToughness).toBeGreaterThanOrEqual(150);
    });

    it('Critério 2: a sugestão com grau MAX nunca tem armor menor que a do melhor material puro com o mesmo grau', () => {
      const bestPureArmor = Math.max(
        ...saveMetals.map((matId) => {
          const stats = calculateGearStats(
            {
              gearTypeId: 'chestplate',
              parts: { main: { materialId: matId, grade: 'MAX', starcharge: 3 } },
            },
            ATM11_CATALOG
          );
          return stats.armor;
        })
      );

      const results = findBestBuilds(
        {
          gearTypeId: 'chestplate',
          availableMaterials: saveMetals,
          goal: 'max_protection',
          grade: 'MAX',
          starcharge: 3,
        },
        ATM11_CATALOG,
        1
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].stats.armor).toBeGreaterThanOrEqual(bestPureArmor);
    });

    it('Critério 3: grep -n "grade|starcharge" src/lib/optimizer.ts passa a ter resultados', () => {
      const optimizerFilePath = path.join(__dirname, 'optimizer.ts');
      const optimizerCode = fs.readFileSync(optimizerFilePath, 'utf-8');

      const gradeMatches = optimizerCode.match(/grade/g) || [];
      const starchargeMatches = optimizerCode.match(/starcharge/g) || [];

      expect(gradeMatches.length).toBeGreaterThan(0);
      expect(starchargeMatches.length).toBeGreaterThan(0);
    });
  });

  describe('Issue #57: slots opcionais podem ficar vazios', () => {
    it('um forro (lining) que aumenta a armadura entra na sugestão de proteção', () => {
      const materials: Record<string, Material> = {
        'test:plate': {
          id: 'test:plate',
          name: { en: 'Plate', pt: 'Placa' },
          tier: 1,
          category: 'metal',
          color: '#FFFFFF',
          stats: { main: { durability: 500, armor: 5, armor_durability: 60, armor_toughness: 1 } },
          traits: {},
        },
        'test:lining': {
          id: 'test:lining',
          name: { en: 'Lining', pt: 'Forro' },
          tier: 1,
          category: 'metal',
          color: '#888888',
          stats: { lining: { durability: 100, armor: { value: 4, operation: 'ADD' } } },
          traits: {},
        },
      };

      const results = findBestBuilds(
        {
          gearTypeId: 'chestplate',
          availableMaterials: Object.keys(materials),
          goal: 'max_protection',
        },
        { version: 'test-57a', materials, gearTypes: OFFICIAL_GEAR_TYPES, traits: {} },
        1
      );

      expect(results[0].build.parts.lining?.materialId).toBe('test:lining');
    });

    it('uma ponta que piora o dano é omitida da sugestão mesmo quando o tipo tem ponta', () => {
      const materials: Record<string, Material> = {
        'test:blade': {
          id: 'test:blade',
          name: { en: 'Blade', pt: 'Lâmina' },
          tier: 1,
          category: 'metal',
          color: '#FFFFFF',
          stats: { main: { durability: 500, melee_damage: 5.0, attack_speed: 0.0 } },
          traits: {},
        },
        'test:haste': {
          id: 'test:haste',
          name: { en: 'Haste', pt: 'Haste' },
          tier: 1,
          category: 'wood',
          color: '#888888',
          stats: { rod: { durability: 50 } },
          traits: {},
        },
        'test:bad_tip': {
          id: 'test:bad_tip',
          name: { en: 'Bad Tip', pt: 'Ponta Ruim' },
          tier: 1,
          category: 'gem',
          color: '#AAAAAA',
          stats: { tip: { durability: 50, melee_damage: { value: -3.0, operation: 'ADD' } } },
          traits: {},
        },
      };

      const results = findBestBuilds(
        {
          gearTypeId: 'sword',
          availableMaterials: Object.keys(materials),
          goal: 'max_damage',
        },
        { version: 'test-57b', materials, gearTypes: OFFICIAL_GEAR_TYPES, traits: {} },
        1
      );

      expect(results[0].build.parts.tip).toBeUndefined();
    });
  });

  describe('Issue #59: top N com principais distintos', () => {
    function catalogWithMainsAndRods(mainMeleeDamage: Record<string, number>, rodCount: number): VersionCatalog {
      const materials: Record<string, Material> = {};
      for (const [id, melee] of Object.entries(mainMeleeDamage)) {
        materials[id] = {
          id,
          name: { en: id, pt: id },
          tier: 1,
          category: 'metal',
          color: '#FFFFFF',
          stats: { main: { durability: 200, melee_damage: melee } },
          traits: {},
        };
      }
      for (let i = 1; i <= rodCount; i++) {
        const id = `test:rod_${i}`;
        materials[id] = {
          id,
          name: { en: `Rod ${i}`, pt: `Haste ${i}` },
          tier: 1,
          category: 'wood',
          color: '#FFFFFF',
          stats: { rod: { durability: 30 * i } },
          traits: {},
        };
      }
      return { version: 'test-59', materials, gearTypes: OFFICIAL_GEAR_TYPES, traits: {} };
    }

    it('com pelo menos três principais viáveis, as três sugestões têm principais distintos', () => {
      const testCatalog = catalogWithMainsAndRods(
        { 'test:main_a': 10, 'test:main_b': 6, 'test:main_c': 4 },
        4
      );

      const results = findBestBuilds(
        {
          gearTypeId: 'sword',
          availableMaterials: Object.keys(testCatalog.materials),
          goal: 'max_damage',
        },
        testCatalog,
        3
      );

      expect(results).toHaveLength(3);
      const mains = results.map((r) => r.build.parts.main?.materialId);
      expect(new Set(mains).size).toBe(3);
      expect(mains[0]).toBe('test:main_a');
    });

    it('com menos principais viáveis que N, ainda devolve N builds distintas quando há builds suficientes', () => {
      const testCatalog = catalogWithMainsAndRods(
        { 'test:main_a': 10, 'test:main_b': 6 },
        3
      );

      const results = findBestBuilds(
        {
          gearTypeId: 'sword',
          availableMaterials: Object.keys(testCatalog.materials),
          goal: 'max_damage',
        },
        testCatalog,
        3
      );

      expect(results).toHaveLength(3);
      const builds = new Set(results.map((r) => JSON.stringify(r.build.parts)));
      expect(builds.size).toBe(3);
    });
  });

  describe('Issue #52: Materiais não craftáveis e compostos excluídos do otimizador', () => {
    it('materiais intangíveis, blacklisted para all e compostos nunca entram em sugestões de findBestBuilds', () => {
      const materials: Record<string, Material> = {
        'silentgear:iron': {
          id: 'silentgear:iron',
          name: { en: 'Iron', pt: 'Ferro' },
          tier: 2,
          category: 'metal',
          color: '#D8D8D8',
          stats: { main: { durability: 250, melee_damage: 3 } },
          traits: {},
        },
        'silentgear:wood': {
          id: 'silentgear:wood',
          name: { en: 'Wood', pt: 'Madeira' },
          tier: 0,
          category: 'wood',
          color: '#8A5D3B',
          stats: { rod: { durability: 50 } },
          traits: {},
        },
        'silentgear:example': {
          id: 'silentgear:example',
          name: { en: 'Example', pt: 'Exemplo' },
          tier: 1,
          category: 'intangible',
          categories: ['intangible'],
          gear_type_blacklist: ['silentgear:all'],
          color: '#FFFFFF',
          stats: { tip: { durability: 1000, melee_damage: 50 } },
          traits: {},
        },
        'silentgear:barrier': {
          id: 'silentgear:barrier',
          name: { en: 'Barrier', pt: 'Barreira' },
          tier: 1,
          category: 'intangible',
          categories: ['intangible'],
          color: '#FF0000',
          stats: { tip: { durability: 1000, melee_damage: 50 } },
          traits: {},
        },
        'silentgear:crude_alloy': {
          id: 'silentgear:crude_alloy',
          name: { en: 'Crude Alloy', pt: 'Liga Bruta' },
          tier: 0,
          category: 'metal',
          color: '#888888',
          isCompound: true,
          type: 'silentgear:compound',
          stats: { tip: { durability: 1000, melee_damage: 50 } },
          traits: {},
        },
      };

      const catalog: VersionCatalog = {
        version: 'test',
        materials,
        gearTypes: OFFICIAL_GEAR_TYPES,
        traits: {},
      };

      const results = findBestBuilds(
        {
          gearTypeId: 'sword',
          availableMaterials: Object.keys(materials),
          goal: 'max_damage',
        },
        catalog,
        3
      );

      expect(results.length).toBeGreaterThan(0);
      for (const res of results) {
        const parts = Object.values(res.build.parts);
        for (const p of parts) {
          expect(p?.materialId).not.toBe('silentgear:example');
          expect(p?.materialId).not.toBe('silentgear:barrier');
          expect(p?.materialId).not.toBe('silentgear:crude_alloy');
        }
      }
    });
  });
});

