import { Material, MaterialCategory, PartSlot } from '@/types/silentgear';
import { getNumericStatValue } from '@/lib/calculator';

export interface FilterMaterialsOptions {
  query?: string;
  category?: MaterialCategory | 'all';
  onlyInventory?: boolean;
  inventory?: Set<string>;
  lang?: 'pt' | 'en';
}

/**
 * Normaliza o texto removendo acentuação / diacríticos e convertendo para minúsculas.
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Calcula a pontuação de relevância de um material para o termo de busca.
 * Prioridade:
 * 1. Nome exato (PT/EN): 100
 * 2. ID exato ou base ID exato: 95
 * 3. Nome inicia com termo (startsWith): 80 (ex: 'unob' -> 'Unobtainium')
 * 4. ID inicia com termo (ex: 'silentgear:wool' ou 'wool'): 70
 * 5. Nome contém termo: 50
 * 6. ID contém termo: 40
 * 7. Categoria contém termo: 30
 */
function calculateRelevanceScore(material: Material, normalizedQuery: string): number {
  if (!normalizedQuery) return 0;

  const normPt = normalizeSearchText(material.name.pt);
  const normEn = normalizeSearchText(material.name.en);
  const normId = normalizeSearchText(material.id);
  const baseId = material.id.includes(':')
    ? normalizeSearchText(material.id.split(':')[1])
    : normId;
  const normCat = normalizeSearchText(material.category);

  // 1. Exato
  if (normPt === normalizedQuery || normEn === normalizedQuery) return 100;
  if (normId === normalizedQuery || baseId === normalizedQuery) return 95;

  // 2. Prefixo (startsWith)
  if (normPt.startsWith(normalizedQuery) || normEn.startsWith(normalizedQuery)) return 80;
  if (baseId.startsWith(normalizedQuery) || normId.startsWith(normalizedQuery)) return 70;

  // 3. Substring (includes)
  if (normPt.includes(normalizedQuery) || normEn.includes(normalizedQuery)) return 50;
  if (normId.includes(normalizedQuery)) return 40;
  if (normCat.includes(normalizedQuery)) return 30;

  return 0;
}

/**
 * Filtra e ordena materiais por busca (PT, EN, ID, categoria), categoria e inventário.
 */
export function filterMaterials(
  materials: Material[],
  options: FilterMaterialsOptions | string = {}
): Material[] {
  const opts: FilterMaterialsOptions = typeof options === 'string' ? { query: options } : options;
  const {
    query = '',
    category = 'all',
    onlyInventory = false,
    inventory,
    lang = 'pt',
  } = opts;

  const normalizedQuery = normalizeSearchText(query);

  const filtered = materials.filter((m) => {
    // Filtro de categoria
    const matchesCat =
      category === 'all' ||
      m.category === category ||
      (m.categories && m.categories.includes(category));
    if (!matchesCat) return false;

    // Filtro de inventário
    if (onlyInventory && inventory && !inventory.has(m.id)) {
      return false;
    }

    // Filtro de texto
    if (normalizedQuery) {
      const score = calculateRelevanceScore(m, normalizedQuery);
      return score > 0;
    }

    return true;
  });

  // Se houver busca, ordenar por relevância (score decrescente), depois tier e nome
  if (normalizedQuery) {
    return [...filtered].sort((a, b) => {
      const scoreA = calculateRelevanceScore(a, normalizedQuery);
      const scoreB = calculateRelevanceScore(b, normalizedQuery);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      if (a.tier !== b.tier) {
        return b.tier - a.tier;
      }
      const nameA = a.name[lang] || a.name.en;
      const nameB = b.name[lang] || b.name.en;
      return nameA.localeCompare(nameB);
    });
  }

  return filtered;
}

/**
 * Retorna uma string compacta e legível descrevendo o stat chave do material para o slot dado.
 */
export function getKeyStatForSlot(
  material: Material,
  slot: PartSlot,
  _lang: 'pt' | 'en' = 'pt'
): string {
  const slotStats = material.stats[slot] || material.stats.main;

  if (slot === 'rod') {
    const mul = material.statModifiers?.rod?.durability?.mul2;
    if (mul !== undefined && mul !== 0) {
      const pct = Math.round(mul * 100);
      return `${pct > 0 ? '+' : ''}${pct}% Dur`;
    }
    if (slotStats?.durability !== undefined) {
      const dur = getNumericStatValue(slotStats.durability);
      if (dur > 0) return `+${dur} Dur`;
    }
  }

  if (slot === 'tip') {
    const dur = getNumericStatValue(slotStats?.durability);
    const dmg = getNumericStatValue(slotStats?.melee_damage);
    const arm = getNumericStatValue(slotStats?.armor);
    if (dmg > 0 && dur > 0) return `+${dur} Dur / ⚔️+${dmg}`;
    if (arm > 0 && dur > 0) return `+${dur} Dur / 🛡️+${arm}`;
    if (dur > 0) return `+${dur} Dur`;
    if (dmg > 0) return `⚔️+${dmg}`;
    if (arm > 0) return `🛡️+${arm}`;
  }

  if (slot === 'coating') {
    const arm = getNumericStatValue(slotStats?.armor);
    const dur = getNumericStatValue(slotStats?.durability);
    if (arm > 0 && dur > 0) return `🛡️+${arm} / +${dur} Dur`;
    if (arm > 0) return `🛡️+${arm}`;
    if (dur > 0) return `+${dur} Dur`;
  }

  if (slotStats) {
    const dur = getNumericStatValue(slotStats.durability);
    const dmg = getNumericStatValue(slotStats.melee_damage);
    const arm = getNumericStatValue(slotStats.armor);
    if (dmg > 0 && dur > 0) return `${dur} Dur / ⚔️${dmg}`;
    if (arm > 0 && dur > 0) return `${dur} Dur / 🛡️${arm}`;
    if (dur > 0) return `${dur} Dur`;
    if (dmg > 0) return `⚔️${dmg}`;
    if (arm > 0) return `🛡️${arm}`;
  }

  return '';
}
