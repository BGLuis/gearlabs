import { describe, it, expect } from 'vitest';
import {
  filterMaterials,
  getKeyStatForSlot,
  normalizeSearchText,
} from './materials';
import { Material } from '@/types/silentgear';

const sampleMaterials: Material[] = [
  {
    id: 'silentgear:iron',
    name: { en: 'Iron', pt: 'Ferro' },
    tier: 2,
    category: 'metal',
    color: '#D8D8D8',
    stats: {
      main: { durability: 250, melee_damage: 2.0, armor: 15 },
      rod: { durability: 50 },
      tip: { durability: 64, melee_damage: 1.0 },
      coating: { durability: 60, armor: 2 },
    },
    statModifiers: {
      rod: { durability: { mul2: 0.1 } },
    },
    traits: {},
  },
  {
    id: 'silentgear:diamond',
    name: { en: 'Diamond', pt: 'Diamante' },
    tier: 3,
    category: 'gem',
    color: '#33EBCB',
    stats: {
      main: { durability: 1561, melee_damage: 3.0, armor: 20 },
      rod: {},
      tip: { durability: 256, melee_damage: 2.0 },
    },
    traits: {},
  },
  {
    id: 'silentgear:unobtainium',
    name: { en: 'Unobtainium', pt: 'Unobtainium' },
    tier: 5,
    category: 'metal',
    color: '#D152E3',
    stats: {
      main: { durability: 9500, melee_damage: 12.0, armor: 30 },
      rod: { durability: 3000 },
      tip: { durability: 1000, melee_damage: 5.0 },
    },
    traits: {},
  },
  {
    id: 'silentgear:wool',
    name: { en: 'Wool', pt: 'Lã' },
    tier: 1,
    category: 'organic',
    color: '#E9ECEC',
    stats: {
      main: { durability: 40, armor: 2 },
      rod: {},
    },
    traits: {},
  },
  {
    id: 'silentgear:wood',
    name: { en: 'Wood', pt: 'Madeira' },
    tier: 1,
    category: 'wood',
    color: '#8A5930',
    stats: {
      main: { durability: 60, melee_damage: 1.0 },
      rod: { durability: 20 },
    },
    statModifiers: {
      rod: { durability: { mul2: -0.1 } },
    },
    traits: {},
  },
];

describe('materials utilities', () => {
  describe('normalizeSearchText', () => {
    it('remove acentos e converte para minúsculas', () => {
      expect(normalizeSearchText('Lã')).toBe('la');
      expect(normalizeSearchText('Aço Tiriano')).toBe('aco tiriano');
      expect(normalizeSearchText('  UNOBTAINIUM  ')).toBe('unobtainium');
    });
  });

  describe('filterMaterials', () => {
    it('digitar unob lista Unobtainium primeiro', () => {
      const results = filterMaterials(sampleMaterials, { query: 'unob' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('silentgear:unobtainium');
    });

    it('digitar lã e silentgear:wool encontra a lã por nome PT e por ID', () => {
      const byPt = filterMaterials(sampleMaterials, { query: 'lã' });
      expect(byPt.map((m) => m.id)).toContain('silentgear:wool');

      const byPtNoAccent = filterMaterials(sampleMaterials, { query: 'la' });
      expect(byPtNoAccent.map((m) => m.id)).toContain('silentgear:wool');

      const byId = filterMaterials(sampleMaterials, { query: 'silentgear:wool' });
      expect(byId.map((m) => m.id)).toContain('silentgear:wool');
    });

    it('filtra por nome PT', () => {
      const results = filterMaterials(sampleMaterials, { query: 'ferro' });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('silentgear:iron');
    });

    it('filtra por nome EN', () => {
      const results = filterMaterials(sampleMaterials, { query: 'diamond' });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('silentgear:diamond');
    });

    it('filtra por ID', () => {
      const results = filterMaterials(sampleMaterials, { query: 'silentgear:wood' });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('silentgear:wood');
    });

    it('filtra por categoria', () => {
      const metals = filterMaterials(sampleMaterials, { category: 'metal' });
      expect(metals.every((m) => m.category === 'metal')).toBe(true);
      expect(metals.map((m) => m.id)).toEqual(
        expect.arrayContaining(['silentgear:iron', 'silentgear:unobtainium'])
      );

      const gems = filterMaterials(sampleMaterials, { category: 'gem' });
      expect(gems.length).toBe(1);
      expect(gems[0].id).toBe('silentgear:diamond');
    });

    it('filtra por inventário se onlyInventory estiver ativo', () => {
      const inv = new Set(['silentgear:iron', 'silentgear:wool']);
      const results = filterMaterials(sampleMaterials, {
        onlyInventory: true,
        inventory: inv,
      });

      expect(results.length).toBe(2);
      expect(results.map((m) => m.id).sort()).toEqual(['silentgear:iron', 'silentgear:wool']);
    });
  });

  describe('getKeyStatForSlot', () => {
    it('retorna stat chave para slot rod com multiplicador', () => {
      const iron = sampleMaterials.find((m) => m.id === 'silentgear:iron')!;
      expect(getKeyStatForSlot(iron, 'rod')).toBe('+10% Dur');
    });

    it('retorna stat chave para slot main com dano e durabilidade', () => {
      const unob = sampleMaterials.find((m) => m.id === 'silentgear:unobtainium')!;
      expect(getKeyStatForSlot(unob, 'main')).toBe('9500 Dur / ⚔️12');
    });

    it('retorna stat chave para slot tip', () => {
      const iron = sampleMaterials.find((m) => m.id === 'silentgear:iron')!;
      expect(getKeyStatForSlot(iron, 'tip')).toBe('+64 Dur / ⚔️+1');
    });

    it('retorna stat chave para slot coating', () => {
      const iron = sampleMaterials.find((m) => m.id === 'silentgear:iron')!;
      expect(getKeyStatForSlot(iron, 'coating')).toBe('🛡️+2 / +60 Dur');
    });
  });
});
