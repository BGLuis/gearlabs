import { describe, it, expect } from 'vitest';
import { resolveCatalogWithAddons } from '@/lib/layer-resolver';
import { CatalogLayer, Material } from '@/types/silentgear';
import atm11Catalog from '../../public/data/versions/atm11/catalog.json';

const baseMaterials = atm11Catalog.baseMaterials as unknown as Record<string, Material>;
const layers = atm11Catalog.layers as unknown as Record<string, CatalogLayer>;
const allAddons = Object.keys(layers);

describe('Auditoria #47: camada sobrescreve o material, não funde com a anterior', () => {
  it('o kubejs de uru_metal não define slot coating, então o material resolvido não tem coating', () => {
    // kubejs/dynamic_data/sgearmetalworks/silentgear_materials/uru_metal.json reescreve o arquivo inteiro
    const kubejsSlots = Object.keys(layers.kubejs.overrides!['sgearmetalworks:uru_metal'].stats ?? {});
    expect(kubejsSlots).not.toContain('coating');

    const resolved = resolveCatalogWithAddons(baseMaterials, layers, allAddons);
    const uru = resolved['sgearmetalworks:uru_metal'];

    expect(uru.stats.coating).toBeUndefined();
    expect(uru.traits?.coating).toBeUndefined();
  });

  it('todo material redefinido pelo kubejs termina com exatamente os slots do kubejs', () => {
    const resolved = resolveCatalogWithAddons(baseMaterials, layers, allAddons);
    for (const [id, override] of Object.entries(layers.kubejs.overrides ?? {})) {
      const expected = Object.keys(override.stats ?? {}).sort();
      expect(Object.keys(resolved[id].stats).sort(), id).toEqual(expected);
    }
  });
});
