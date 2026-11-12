import { describe, it, expect } from 'vitest';
import { resolveCatalogWithAddons } from '@/lib/layer-resolver';
import { calculateSynergy } from '@/lib/calculator';
import { readLatestAtm11Catalog } from '../../tests/helpers/atm11-catalog';
import { Material, CatalogLayer } from '@/types/silentgear';

const atm11Catalog = readLatestAtm11Catalog();

describe('LayerResolver & Addon Management (Issue #47)', () => {
  const baseMaterials = atm11Catalog.baseMaterials as unknown as Record<string, Material>;
  const layers = atm11Catalog.layers as unknown as Record<string, CatalogLayer>;

  it('Critério 1: Desativar Metalworks remove uru_metal, meat, tira casting de iron e reduz sinergia de 1,166 para 0,936', () => {
    // 1. Catálogo com Metalworks ativo (e outros addons ativos padrão)
    const withMetalworks = resolveCatalogWithAddons(baseMaterials, layers, [
      'allthemodium',
      'silentgems',
      'sgearmetalworks',
      'kubegroovy',
    ]);

    expect(withMetalworks['sgearmetalworks:uru_metal']).toBeDefined();
    expect(withMetalworks['sgearmetalworks:meat']).toBeDefined();
    expect(withMetalworks['silentgear:iron']?.categories).toContain('casting');
    expect(withMetalworks['silentgear:diamond']?.categories).toContain('casting');

    const synergyWithMW = calculateSynergy([
      withMetalworks['silentgear:iron']!,
      withMetalworks['silentgear:diamond']!,
    ]);
    expect(Number(synergyWithMW.toFixed(3))).toBe(1.166);

    // 2. Catálogo SEM Metalworks
    const withoutMetalworks = resolveCatalogWithAddons(baseMaterials, layers, [
      'silentgems',
      'kubegroovy',
    ]);

    // Materiais específicos do Metalworks devem sumir
    expect(withoutMetalworks['sgearmetalworks:uru_metal']).toBeUndefined();
    expect(withoutMetalworks['sgearmetalworks:meat']).toBeUndefined();

    // A categoria casting do Metalworks deve sair de iron e diamond
    expect(withoutMetalworks['silentgear:iron']?.categories).not.toContain('casting');
    expect(withoutMetalworks['silentgear:diamond']?.categories).not.toContain('casting');

    // A sinergia entre iron (metal) e diamond (gem) deve cair para 0.936 por falta de categoria comum (-0.2)
    const synergyWithoutMW = calculateSynergy([
      withoutMetalworks['silentgear:iron']!,
      withoutMetalworks['silentgear:diamond']!,
    ]);
    expect(Number(synergyWithoutMW.toFixed(3))).toBe(0.936);
  });

  it('Critério 2: silentgems:reinforced_gold e silentgems:reinforced_silver existem com Silent Gems ativo', () => {
    // Com Silent Gems
    const withGems = resolveCatalogWithAddons(baseMaterials, layers, ['silentgems']);
    expect(withGems['silentgems:reinforced_gold']).toBeDefined();
    expect(withGems['silentgems:reinforced_silver']).toBeDefined();
    expect(withGems['silentgems:reinforced_gold']?.source).toBe('silentgems');
    expect(withGems['silentgems:reinforced_silver']?.source).toBe('silentgems');
    expect(withGems['silentgems:reinforced_gold']?.tier).toBe(0);
    expect(withGems['silentgems:reinforced_silver']?.tier).toBe(0);

    // Sem Silent Gems
    const withoutGems = resolveCatalogWithAddons(baseMaterials, layers, ['sgearmetalworks']);
    expect(withoutGems['silentgems:reinforced_gold']).toBeUndefined();
    expect(withoutGems['silentgems:reinforced_silver']).toBeUndefined();
  });

  it('Critério 3: Todo material no catálogo resolvido possui o campo source', () => {
    const fullCatalog = resolveCatalogWithAddons(baseMaterials, layers, [
      'allthemodium',
      'silentgems',
      'sgearmetalworks',
      'kubegroovy',
    ]);

    const materials = Object.values(fullCatalog);
    expect(materials.length).toBeGreaterThan(150);

    for (const mat of materials) {
      expect(mat.source).toBeDefined();
      expect(['silentgear', 'allthemodium', 'silentgems', 'sgearmetalworks', 'kubegroovy']).toContain(mat.source);
    }

    // silentgear:iron deve ser silentgear
    expect(fullCatalog['silentgear:iron']?.source).toBe('silentgear');
    // silentgems:ruby deve ser silentgems
    expect(fullCatalog['silentgems:ruby']?.source).toBe('silentgems');
    // sgearmetalworks:meat deve ser sgearmetalworks
    expect(fullCatalog['sgearmetalworks:meat']?.source).toBe('sgearmetalworks');
    // silentgear:allthemodium deve ser allthemodium
    expect(fullCatalog['silentgear:allthemodium']?.source).toBe('allthemodium');
  });

  it('KubeGroovy override em uru_metal não deve criar material fantasma quando Metalworks está desativado', () => {
    // KubeGroovy ativo mas Metalworks desativado
    const catalog = resolveCatalogWithAddons(baseMaterials, layers, ['kubegroovy']);
    expect(catalog['sgearmetalworks:uru_metal']).toBeUndefined();

    // Quando ambos estão ativos, uru_metal existe e recebe os stats de KubeGroovy
    const withBoth = resolveCatalogWithAddons(baseMaterials, layers, [
      'sgearmetalworks',
      'kubegroovy',
    ]);
    expect(withBoth['sgearmetalworks:uru_metal']).toBeDefined();
    expect(withBoth['sgearmetalworks:uru_metal']?.stats.main?.melee_damage).toBe(35);
    expect(withBoth['sgearmetalworks:uru_metal']?.overriddenBy).toContain('kubegroovy');
  });

  it('A ordem das camadas do catálogo atual é a de carga, e termina na camada de script', () => {
    expect(Object.keys(layers)).toEqual(['allthemodium', 'silentgems', 'sgearmetalworks', 'kubegroovy']);
  });

  describe('ordem derivada (#93)', () => {
    const mat = (trait: string): Material =>
      ({
        ...baseMaterials['silentgear:iron'],
        id: 'silentgear:allthemodium',
        traits: { main: [{ name: trait, level: 1 }] },
      }) as Material;
    const layer = (id: string, trait: string): CatalogLayer => ({
      id,
      name: id,
      version: '1',
      materials: { 'silentgear:allthemodium': mat(trait) },
    });

    it('a camada kubegroovy vence a do jar allthemodium no mesmo material', () => {
      const ordered = { allthemodium: layer('allthemodium', 'jar'), kubegroovy: layer('kubegroovy', 'groovy') };
      const resolved = resolveCatalogWithAddons(baseMaterials, ordered, ['allthemodium', 'kubegroovy']);
      expect(resolved['silentgear:allthemodium'].traits.main![0].name).toBe('groovy');
      expect(Object.keys(ordered).at(-1)).toBe('kubegroovy');
    });

    it('a ordem vem das chaves de layers, não do nome da camada', () => {
      const flipped = { kubegroovy: layer('kubegroovy', 'groovy'), allthemodium: layer('allthemodium', 'jar') };
      const resolved = resolveCatalogWithAddons(baseMaterials, flipped, ['allthemodium', 'kubegroovy']);
      expect(resolved['silentgear:allthemodium'].traits.main![0].name).toBe('jar');
    });
  });
});
