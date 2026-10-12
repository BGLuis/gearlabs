import { CatalogLayer, Material, PartSlot } from '@/types/silentgear';
import { resolveMaterialParents } from '@/lib/datapack-parser';

export const CANONICAL_LAYER_ORDER = ['silentgems', 'sgearmetalworks', 'kubejs'];

/**
 * Clona profundamente um material para evitar mutações indesejadas no catálogo base.
 */
export function cloneMaterial(mat: Material): Material {
  return JSON.parse(JSON.stringify(mat));
}

/**
 * Resoluve dinamicamente as camadas de catálogo (Silent Gear base + Addons ativos).
 * - baseMaterials: materiais puros do Silent Gear (source: 'silentgear')
 * - layers: camadas de addons com novos materiais e/ou overrides
 * - activeAddonIds: conjunto de IDs de addons ativados (ex: ['silentgems', 'sgearmetalworks'])
 */
export function resolveCatalogWithAddons(
  baseMaterials: Record<string, Material>,
  layers: Record<string, CatalogLayer> = {},
  activeAddonIds: string[] | Set<string> = []
): Record<string, Material> {
  const activeSet = new Set(activeAddonIds);
  const resolved: Record<string, Material> = {};

  // 1. Inicializar com os materiais base do Silent Gear
  for (const [id, mat] of Object.entries(baseMaterials)) {
    const cloned = cloneMaterial(mat);
    cloned.source = cloned.source || 'silentgear';
    resolved[id] = cloned;
  }

  // 2. Determinar a ordem de carga das camadas ativas
  const layerKeys = Object.keys(layers);
  const orderedLayers = [
    ...CANONICAL_LAYER_ORDER.filter((k) => layerKeys.includes(k) && activeSet.has(k)),
    ...layerKeys.filter((k) => !CANONICAL_LAYER_ORDER.includes(k) && activeSet.has(k)),
  ];

  // 3. Aplicar cada camada ativa na ordem de precedência
  for (const layerId of orderedLayers) {
    const layer = layers[layerId];
    if (!layer) continue;

    // a) Novos materiais introduzidos pela camada
    if (layer.materials) {
      for (const [matId, mat] of Object.entries(layer.materials)) {
        const cloned = cloneMaterial(mat);
        cloned.source = cloned.source || layerId;
        resolved[matId] = cloned;
      }
    }

    // b) Sobrescritas em materiais existentes
    if (layer.overrides) {
      for (const [matId, override] of Object.entries(layer.overrides)) {
        const target = resolved[matId];
        // Só aplica override se o material alvo existir no catálogo resolvido
        if (!target) continue;

        // Categorias: união das categorias existentes com as novas
        if (override.categories && override.categories.length > 0) {
          const baseCats = target.categories || (target.category ? [target.category] : []);
          target.categories = Array.from(new Set([...baseCats, ...override.categories]));
        }

        // Stats por slot
        if (override.stats) {
          target.stats = { ...target.stats };
          for (const [slotKey, slotStats] of Object.entries(override.stats)) {
            const slot = slotKey as PartSlot;
            if (!slotStats) continue;
            const existingSlot = target.stats[slot] || {};
            target.stats[slot] = {
              ...existingSlot,
              ...slotStats,
              ...(slotStats.by_type
                ? {
                    by_type: {
                      ...(existingSlot.by_type || {}),
                      ...slotStats.by_type,
                    },
                  }
                : {}),
            };
          }
        }

        // StatModifiers
        if (override.statModifiers) {
          target.statModifiers = {
            ...(target.statModifiers || {}),
            ...override.statModifiers,
          };
        }

        // Traits
        if (override.traits) {
          target.traits = {
            ...(target.traits || {}),
            ...override.traits,
          };
        }

        // Propriedades escalares
        if (override.tier !== undefined) target.tier = override.tier;
        if (override.color !== undefined) target.color = override.color;
        if (override.parent !== undefined) target.parent = override.parent;
        if (override.harvest_tier !== undefined) target.harvest_tier = override.harvest_tier;

        // Rastrear modificadores
        target.overriddenBy = Array.from(new Set([...(target.overriddenBy || []), layerId]));
      }
    }
  }

  // 4. Resolver herança de parent para todos os materiais ativos
  return resolveMaterialParents(resolved);
}
