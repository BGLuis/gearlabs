import { describe, it, expect } from 'vitest';
import type { Material } from '@/types/silentgear';
import {
  extractMaterialIdFromPath,
  parseMaterialJson,
  parseDumpTsv,
  parseStatValueEntry,
  parseTsvCellValue,
  resolveMaterialParents,
} from './datapack-parser';

describe('datapack-parser (Issue #7)', () => {
  describe('extractMaterialIdFromPath', () => {
    it('extracts namespace and name from standard data path', () => {
      expect(
        extractMaterialIdFromPath('data/silentgear/silentgear_materials/allthemodium.json')
      ).toBe('silentgear:allthemodium');
    });

    it('extracts namespace and name from kubejs dynamic_data path', () => {
      expect(
        extractMaterialIdFromPath('kubejs/dynamic_data/silentgear/silentgear_materials/allthemodium.json')
      ).toBe('silentgear:allthemodium');
    });

    it('extracts custom mod namespaces like sgearmetalworks', () => {
      expect(
        extractMaterialIdFromPath('data/sgearmetalworks/silentgear_materials/uru_metal.json')
      ).toBe('sgearmetalworks:uru_metal');
    });

    it('extracts nested subpaths like wood/oak, wool/white, terracotta/magenta, stone/granite', () => {
      expect(
        extractMaterialIdFromPath('data/silentgear/silentgear_materials/wood/oak.json')
      ).toBe('silentgear:wood/oak');
      expect(
        extractMaterialIdFromPath('data/silentgear/silentgear_materials/wool/white.json')
      ).toBe('silentgear:wool/white');
      expect(
        extractMaterialIdFromPath('data/silentgear/silentgear_materials/terracotta/magenta.json')
      ).toBe('silentgear:terracotta/magenta');
      expect(
        extractMaterialIdFromPath('data/silentgear/silentgear_materials/stone/granite.json')
      ).toBe('silentgear:stone/granite');
      expect(
        extractMaterialIdFromPath('data/silentgear/silentgear_materials/sandstone/red.json')
      ).toBe('silentgear:sandstone/red');
    });

    it('returns null for non-material paths', () => {
      expect(extractMaterialIdFromPath('data/silentgear/recipes/iron_pickaxe.json')).toBeNull();
      expect(extractMaterialIdFromPath('data/silentgear/traits/malleable.json')).toBeNull();
    });
  });

  describe('parseMaterialJson', () => {
    const atm11AllthemodiumJson = {
      type: 'silentgear:simple',
      parent: 'silentgear:empty',
      crafting: {
        can_salvage: true,
        categories: ['metal', 'endgame'],
        gear_type_blacklist: [],
        ingredient: 'kubejs:silent_allthemodium_plate',
      },
      display: {
        color: '#FFFFEF0E',
        main_texture_type: 'HIGH_CONTRAST',
        name: {
          translate: 'material.silentgear.allthemodium',
        },
      },
      properties: {
        'silentgear:main': {
          durability: 5500.0,
          enchantment_value: 85.0,
          attack_damage: 22.0,
          attack_speed: 8.2,
          armor: 60.0,
          'armor/helmet': 15.0,
          'armor/chestplate': 15.0,
          'armor/leggings': 15.0,
          'armor/boots': 15.0,
          armor_durability: 60.0,
          armor_toughness: 60.0,
          magic_armor: 200.0,
          ranged_damage: 0.0,
          rarity: 90.0,
          harvest_speed: 8.0,
          harvest_tier: {
            incorrect_blocks_for_tool: 'allthemodium:incorrect_for_allthemodium_tool',
            level_hint: '5',
            name: 'allthemodium',
          },
          traits: [
            { trait: 'silentgear:malleable', level: 4 },
            { trait: 'silentgear:crushing', level: 4 },
          ],
        },
        'silentgear:rod': {
          durability: {
            operation: 'MULTIPLY_TOTAL',
            value: 1.5,
          },
          enchantment_value: {
            operation: 'ADD',
            value: 3.0,
          },
          rarity: 70.0,
          traits: [{ trait: 'silentgear:hard', level: 5 }],
        },
        'silentgear:tip': {
          durability: {
            operation: 'ADD',
            value: 16.0,
          },
          armor_durability: {
            operation: 'ADD',
            value: 10.0,
          },
          harvest_tier: {
            incorrect_blocks_for_tool: 'allthemodium:incorrect_for_allthemodium_tool',
            level_hint: '5',
            name: 'allthemodium',
          },
          harvest_speed: {
            operation: 'ADD',
            value: 6.0,
          },
          magic_damage: {
            operation: 'ADD',
            value: 2.0,
          },
          rarity: {
            operation: 'ADD',
            value: 30.0,
          },
        },
      },
    };

    it('critério 1: parseMaterialJson retorna ID silentgear:allthemodium, categorias metal e endgame, rod durability { value: 1.5, operation: "MULTIPLY_TOTAL" } e armor_durability 60', () => {
      const mat = parseMaterialJson(
        'data/silentgear/silentgear_materials/allthemodium.json',
        atm11AllthemodiumJson
      );

      expect(mat).not.toBeNull();
      expect(mat?.id).toBe('silentgear:allthemodium');
      expect(mat?.categories).toEqual(['metal', 'endgame']);
      expect(mat?.stats.rod?.durability).toEqual({
        value: 1.5,
        operation: 'MULTIPLY_TOTAL',
      });
      expect(mat?.stats.main?.armor_durability).toBe(60.0);

      // Verificações adicionais de consistência de armadura
      expect(mat?.stats.main?.armor).toBe(60.0);
      expect(mat?.stats.main?.armor_toughness).toBe(60.0);
      expect(mat?.stats.main?.magic_armor).toBe(200.0);
      expect(mat?.stats.main?.by_type?.armor).toEqual({
        helmet: 15.0,
        chestplate: 15.0,
        leggings: 15.0,
        boots: 15.0,
      });
      expect(mat?.color).toBe('#FFEF0E');
      expect(mat?.stats.main?.harvest_tier).toEqual({ name: 'allthemodium', level: 5 });
    });

    it('critério 2: um material com armor_toughness: 0 importa toughness 0, não um padrão', () => {
      const jsonWithZero = {
        crafting: { categories: ['metal'] },
        properties: {
          'silentgear:main': {
            armor_toughness: 0,
            magic_armor: 0,
          },
        },
      };

      const mat = parseMaterialJson(
        'data/silentgear/silentgear_materials/zero_toughness.json',
        jsonWithZero
      );

      expect(mat).not.toBeNull();
      expect(mat?.stats.main?.armor_toughness).toBe(0);
      expect(mat?.stats.main?.magic_armor).toBe(0);
      // Campos ausentes não devem receber valores fictícios inventados (ex: durability não deve ser 250)
      expect(mat?.stats.main?.durability).toBeUndefined();
      expect(mat?.stats.main?.melee_damage).toBeUndefined();
    });

    it('descarta arquivos de receitas/traits fora de silentgear_materials', () => {
      const nonMaterial = parseMaterialJson('data/silentgear/recipes/sword.json', {
        type: 'minecraft:crafting_shaped',
      });
      expect(nonMaterial).toBeNull();
    });
  });

  describe('parseTsvCellValue', () => {
    it('interpreta modificadores ADD explícitos (+4, ADD 4, +4.0)', () => {
      expect(parseTsvCellValue('+4')).toEqual({ value: 4, operation: 'ADD' });
      expect(parseTsvCellValue('ADD 4')).toEqual({ value: 4, operation: 'ADD' });
      expect(parseTsvCellValue('+4.0')).toEqual({ value: 4, operation: 'ADD' });
      expect(parseTsvCellValue('-2.5')).toEqual({ value: -2.5, operation: 'ADD' });
    });

    it('interpreta modificadores MAX (^5, ↑5, MAX 5)', () => {
      expect(parseTsvCellValue('^5')).toEqual({ value: 5, operation: 'MAX' });
      expect(parseTsvCellValue('↑5')).toEqual({ value: 5, operation: 'MAX' });
      expect(parseTsvCellValue('MAX 5')).toEqual({ value: 5, operation: 'MAX' });
    });

    it('interpreta percentuais como MULTIPLY_BASE', () => {
      expect(parseTsvCellValue('+15%')).toEqual({ value: 0.15, operation: 'MULTIPLY_BASE' });
      expect(parseTsvCellValue('-20%')).toEqual({ value: -0.2, operation: 'MULTIPLY_BASE' });
    });

    it('interpreta multiplicadores totais x1.5 / MUL2', () => {
      expect(parseTsvCellValue('x1.5')).toEqual({ value: 0.5, operation: 'MULTIPLY_TOTAL' });
      expect(parseTsvCellValue('MUL2 1.5')).toEqual({ value: 1.5, operation: 'MULTIPLY_TOTAL' });
    });

    it('interpreta números normais', () => {
      expect(parseTsvCellValue('60')).toBe(60);
      expect(parseTsvCellValue('5500.0')).toBe(5500.0);
    });

    it('retorna undefined para células vazias ou com traço', () => {
      expect(parseTsvCellValue('')).toBeUndefined();
      expect(parseTsvCellValue('-')).toBeUndefined();
    });
  });

  describe('parseStatValueEntry', () => {
    it('lista de números simples usa AVERAGE como operação padrão (NumberProperty.java:30-41)', () => {
      expect(parseStatValueEntry([15, 40])).toEqual([
        { value: 15, operation: 'AVERAGE' },
        { value: 40, operation: 'AVERAGE' },
      ]);
    });

    it('preserva a operação explícita dos itens de uma lista', () => {
      expect(parseStatValueEntry([{ value: 2, operation: 'ADD' }, 3])).toEqual([
        { value: 2, operation: 'ADD' },
        { value: 3, operation: 'AVERAGE' },
      ]);
    });
  });

  describe('parseDumpTsv', () => {
    it('critério 3: parseDumpTsv sobre um trecho real de material_export.tsv devolve ID silentgear:allthemodium, armor 60 e o coating com toughness ADD 4', () => {
      const realTsvSnippet = [
        'Pack\tName\tType\tID\tParent\tCategories\tDurability\tArmor Durability\tRepair Efficiency\tRepair Bonus\tEnchantment Value\tCharging Value\tRarity\tHarvest Tier\tHarvest Speed\tBlock Reach\tAttack Damage\tAttack Speed\tAttack Reach\tMagic Damage\tRanged Damage\tDraw Speed\tProjectile Speed\tProjectile Accuracy\tArmor\tArmor Toughness\tKnockback Resistance\tMagic Armor',
        'mod/allthemodium\tAllthemodium\tMain\tsilentgear:allthemodium\t\tMetal, Endgame\t5500\t60\t\t\t85\t\t90\tallthemodium\t8\t\t22\t8.2\t\t\t0\t\t\t\t60\t60\t\t200',
        'mod/silentgear\tNetherite Coating\tCoating\tsilentgear:netherite\t\tMetal, Endgame\t\t\t\t\t5\t\t40\tnetherite\t\t\t\t\t\t\t\t\t\t\t\t+4\t+1\t',
      ].join('\n');

      const catalog = parseDumpTsv(realTsvSnippet);

      // 1. Allthemodium Main
      const allthemodium = catalog.materials['silentgear:allthemodium'];
      expect(allthemodium).toBeDefined();
      expect(allthemodium.id).toBe('silentgear:allthemodium');
      expect(allthemodium.categories).toEqual(['metal', 'endgame']);
      expect(allthemodium.stats.main?.armor).toBe(60);
      expect(allthemodium.stats.main?.durability).toBe(5500);
      expect(allthemodium.stats.main?.magic_armor).toBe(200);

      // 2. Netherite Coating
      const netherite = catalog.materials['silentgear:netherite'];
      expect(netherite).toBeDefined();
      expect(netherite.id).toBe('silentgear:netherite');
      expect(netherite.stats.coating?.armor_toughness).toEqual({
        value: 4,
        operation: 'ADD',
      });
      expect(netherite.stats.coating?.knockback_resistance).toEqual({
        value: 1,
        operation: 'ADD',
      });
    });

    it('funciona com linhas de múltiplos tipos para o mesmo material', () => {
      const tsvMultiSlot = [
        'Pack\tName\tType\tID\tParent\tCategories\tDurability\tArmor\tArmor Toughness',
        'mod/allthemodium\tAllthemodium\tMain\tsilentgear:allthemodium\t\tMetal\t5500\t60\t60',
        'mod/allthemodium\tAllthemodium Rod\tRod\tsilentgear:allthemodium\t\tMetal\tx2.5\t\t',
      ].join('\n');

      const catalog = parseDumpTsv(tsvMultiSlot);
      const mat = catalog.materials['silentgear:allthemodium'];
      expect(mat.stats.main?.durability).toBe(5500);
      expect(mat.stats.main?.armor).toBe(60);
      expect(mat.stats.rod?.durability).toEqual({ value: 1.5, operation: 'MULTIPLY_TOTAL' });
    });

    it('suporta fallback legado de 4 colunas simples', () => {
      const legacyTsv = [
        'id\ttier\tdurability\tdamage',
        'silentgear:custom_mat\t2\t300\t4.5',
      ].join('\n');

      const catalog = parseDumpTsv(legacyTsv);
      const mat = catalog.materials['silentgear:custom_mat'];
      expect(mat.id).toBe('silentgear:custom_mat');
      expect(mat.tier).toBe(2);
      expect(mat.stats.main?.durability).toBe(300);
      expect(mat.stats.main?.melee_damage).toBe(4.5);
    });
  });

  describe('resolveMaterialParents (Issue #46)', () => {
    it('material filho sem properties herda stats, traits e categorias do pai', () => {
      const parentJson = {
        type: 'silentgear:simple',
        crafting: { categories: ['wood', 'organic'] },
        display: { color: '#896727' },
        properties: {
          'silentgear:main': {
            durability: 59,
            armor: 7,
            armor_durability: 8,
            harvest_tier: { name: 'wood' },
            traits: [
              { trait: 'silentgear:flammable', level: 1 },
              { trait: 'silentgear:jagged', level: 1 },
            ],
          },
          'silentgear:rod': {
            traits: [{ trait: 'silentgear:flexible', level: 2 }],
          },
        },
      };

      const childOakJson = {
        type: 'silentgear:simple',
        parent: 'silentgear:wood',
        crafting: { categories: [] },
        display: { color: '#B8945F' },
        properties: {},
      };

      const parentMat = parseMaterialJson('data/silentgear/silentgear_materials/wood.json', parentJson)!;
      const childMat = parseMaterialJson('data/silentgear/silentgear_materials/wood/oak.json', childOakJson)!;

      expect(childMat.id).toBe('silentgear:wood/oak');
      expect(childMat.parent).toBe('silentgear:wood');
      expect(childMat.name.en).toBe('Oak Wood');
      expect(childMat.name.pt).toBe('Madeira de Carvalho');

      const resolved = resolveMaterialParents({
        [parentMat.id]: parentMat,
        [childMat.id]: childMat,
      });

      const oak = resolved['silentgear:wood/oak'];
      expect(oak).toBeDefined();
      expect(oak.category).toBe('wood');
      expect(oak.categories).toEqual(['wood', 'organic']);
      expect(oak.stats.main?.durability).toBe(59);
      expect(oak.stats.main?.armor).toBe(7);
      expect(oak.stats.main?.harvest_tier).toEqual({ name: 'wood', level: 0 });
      expect(oak.traits.main).toEqual([
        { name: 'silentgear:flammable', level: 1 },
        { name: 'silentgear:jagged', level: 1 },
      ]);
      expect(oak.traits.rod).toEqual([{ name: 'silentgear:flexible', level: 2 }]);
      expect(oak.color).toBe('#B8945F');
    });

    it('material filho com traits personalizados sobrepõe traits do pai mas herda stats', () => {
      const parentMat = parseMaterialJson('data/silentgear/silentgear_materials/wood.json', {
        crafting: { categories: ['wood'] },
        properties: {
          'silentgear:main': {
            durability: 59,
            armor: 7,
            traits: [{ trait: 'silentgear:flammable', level: 1 }],
          },
        },
      })!;

      const childWarpedMat = parseMaterialJson('data/silentgear/silentgear_materials/wood/warped.json', {
        parent: 'silentgear:wood',
        crafting: { categories: [] },
        properties: {
          'silentgear:main': {
            traits: [{ trait: 'silentgear:jagged', level: 1 }],
          },
        },
      })!;

      const resolved = resolveMaterialParents({
        [parentMat.id]: parentMat,
        [childWarpedMat.id]: childWarpedMat,
      });

      const warped = resolved['silentgear:wood/warped'];
      expect(warped.stats.main?.durability).toBe(59);
      expect(warped.stats.main?.armor).toBe(7);
      // Mantém exclusivamente traits do filho (não inflamável)
      expect(warped.traits.main).toEqual([{ name: 'silentgear:jagged', level: 1 }]);
    });

    it('resolve múltiplos slots incluindo lining para materiais de lã', () => {
      const woolMat = parseMaterialJson('data/silentgear/silentgear_materials/wool.json', {
        crafting: { categories: ['cloth', 'organic'] },
        properties: {
          'silentgear:main': { armor: 4 },
          'silentgear:grip': { attack_speed: { operation: 'ADD', value: 0.2 } },
          'silentgear:lining': {
            knockback_resistance: { operation: 'ADD', value: 0.1 },
            traits: [{ trait: 'silentgear:flexible', level: 2 }],
          },
        },
      })!;

      const whiteWoolMat = parseMaterialJson('data/silentgear/silentgear_materials/wool/white.json', {
        parent: 'silentgear:wool',
        crafting: { categories: [] },
        properties: {},
      })!;

      const resolved = resolveMaterialParents({
        [woolMat.id]: woolMat,
        [whiteWoolMat.id]: whiteWoolMat,
      });

      const whiteWool = resolved['silentgear:wool/white'];
      expect(whiteWool.id).toBe('silentgear:wool/white');
      expect(whiteWool.name.en).toBe('White Wool');
      expect(whiteWool.name.pt).toBe('Lã Branca');
      expect(whiteWool.stats.main?.armor).toBe(4);
      expect(whiteWool.stats.lining?.knockback_resistance).toEqual({ operation: 'ADD', value: 0.1 });
      expect(whiteWool.traits.lining).toEqual([{ name: 'silentgear:flexible', level: 2 }]);
    });

    it('detecta ciclos na hierarquia sem entrar em loop infinito', () => {
      const matA = parseMaterialJson('data/silentgear/silentgear_materials/a.json', {
        parent: 'silentgear:b',
        properties: { 'silentgear:main': { durability: 100 } },
      })!;
      const matB = parseMaterialJson('data/silentgear/silentgear_materials/b.json', {
        parent: 'silentgear:a',
        properties: { 'silentgear:main': { durability: 200 } },
      })!;

      const resolved = resolveMaterialParents({
        'silentgear:a': matA,
        'silentgear:b': matB,
      });

      expect(resolved['silentgear:a']).toBeDefined();
      expect(resolved['silentgear:b']).toBeDefined();
    });

    it('resolve herança contra catálogo de fallback se o pai não estiver no lote', () => {
      const childMat = parseMaterialJson('data/custom/silentgear_materials/wood/cherry.json', {
        parent: 'silentgear:wood',
        properties: {},
      })!;

      const fallbackMat = parseMaterialJson('data/silentgear/silentgear_materials/wood.json', {
        properties: { 'silentgear:main': { durability: 60 } },
      })!;

      const resolved = resolveMaterialParents(
        { [childMat.id]: childMat },
        { [fallbackMat.id]: fallbackMat }
      );

      expect(resolved['custom:wood/cherry'].stats.main?.durability).toBe(60);
    });

    it('filho sobrescreve só os tipos que define e mantém os tipos herdados do pai (Issue #40)', () => {
      const base = { name: { en: 'Base', pt: 'Base' }, tier: 2, category: 'metal', color: '#FFFFFF', traits: {} };
      const parent = {
        ...base,
        id: 'silentgear:base',
        stats: { main: { by_type: { attack_speed: { axe: -0.1, hoe: 0 } } } },
      } as unknown as Material;
      const child = {
        ...base,
        id: 'silentgear:child',
        parent: 'silentgear:base',
        stats: { main: { by_type: { attack_speed: { axe: -0.3 }, armor: { helmet: 2 } } } },
      } as unknown as Material;

      const resolved = resolveMaterialParents({ [parent.id]: parent, [child.id]: child });

      expect(resolved['silentgear:child'].stats.main?.by_type).toEqual({
        attack_speed: { axe: -0.3, hoe: 0 },
        armor: { helmet: 2 },
      });
    });
  });
});
