import { describe, it, expect } from 'vitest';
import { findBestBuilds } from './optimizer';
import {
  OFFICIAL_MATERIALS_1_20,
  OFFICIAL_GEAR_TYPES,
  OFFICIAL_TRAITS,
} from '@/data/defaultCatalog';
import { VersionCatalog } from '@/types/silentgear';

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

  it('encontra a melhor armadura para máxima proteção (max_protection)', () => {
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
    // Netherite e Crimson Steel possuem armadura alta e toughness elevada
    expect(['silentgear:netherite', 'silentgear:crimson_steel']).toContain(
      best.build.parts.main?.materialId
    );
    expect(best.stats.armor).toBeGreaterThanOrEqual(20);
  });

  it('executa em tempo ultrarrápido (< 50ms)', () => {
    const allMaterials = Object.keys(catalog.materials);
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
    expect(elapsed).toBeLessThan(50); // Garantia de execução sub-50ms
  });
});
