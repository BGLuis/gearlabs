import { describe, it, expect } from 'vitest';
import { findBestBuilds } from './optimizer';
import { validateAlloy } from './parts';
import { calculateGearStats } from './calculator';
import { Material, VersionCatalog } from '@/types/silentgear';
import atm11Json from '../../public/data/versions/atm11/catalog.json';

const atm11 = atm11Json as unknown as VersionCatalog;
const allMaterialIds = Object.keys(atm11.materials);

describe('Auditoria #56: sugestões de liga respeitam as máquinas', () => {
  const results = findBestBuilds(
    {
      gearTypeId: 'chestplate',
      availableMaterials: allMaterialIds,
      goal: 'max_protection',
      grade: 'MAX',
      starcharge: 3,
      allowAlloys: true,
    },
    atm11,
    3
  );

  it('a busca devolve ligas, senão os testes abaixo seriam vazios', () => {
    expect(results.some((r) => (r.build.parts.main?.materials?.length ?? 0) > 1)).toBe(true);
  });

  it('toda liga sugerida traz o tipo de liga e é aceita pela máquina desse tipo', () => {
    for (const r of results) {
      const main = r.build.parts.main!;
      if (!main.materials || main.materials.length < 2) continue;

      expect(main.alloyType, 'alloyType da sugestão').toBeDefined();
      const mats = main.materials.map((sm) => atm11.materials[sm.materialId] as Material);
      const validation = validateAlloy(mats, main.alloyType!);
      expect(validation.valid, validation.errors.join(' ')).toBe(true);
    }
  });

  it('as ligas sugeridas não gravam grau nem starcharge por submaterial (o jogo só tem os da liga)', () => {
    for (const r of results) {
      for (const sub of r.build.parts.main?.materials ?? []) {
        expect(sub.grade).toBeUndefined();
        expect(sub.starcharge).toBeUndefined();
      }
    }
  });

  it('o melhor peitoral alcança a armadura do item do save (40,97) usando só ligas válidas', () => {
    expect(results[0].stats.armor).toBeGreaterThanOrEqual(40.9);
  });
});

describe('Auditoria #56: a meta de proteção prioriza armadura, não durabilidade', () => {
  it('entre unobtainium e uru_metal, o primeiro resultado tem a maior armadura possível', () => {
    const candidates = ['silentgear:unobtainium', 'sgearmetalworks:uru_metal'];
    const bestPureArmor = Math.max(
      ...candidates.map(
        (id) => calculateGearStats({ gearTypeId: 'chestplate', parts: { main: { materialId: id } } }, atm11).armor
      )
    );

    const [best] = findBestBuilds(
      { gearTypeId: 'chestplate', availableMaterials: candidates, goal: 'max_protection' },
      atm11,
      1
    );

    expect(best.stats.armor).toBeGreaterThanOrEqual(bestPureArmor);
  });
});

describe('Auditoria #40: otimizador aceita material válido só para uma peça', () => {
  it('turtle (armor_durability por helmet) é candidato a capacete', () => {
    const results = findBestBuilds(
      { gearTypeId: 'helmet', availableMaterials: ['silentgear:turtle'], goal: 'max_protection' },
      atm11,
      1
    );

    expect(results).toHaveLength(1);
    expect(results[0].build.parts.main?.materialId).toBe('silentgear:turtle');
  });
});
