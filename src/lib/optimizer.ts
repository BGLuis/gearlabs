import {
  GearBuild,
  GearType,
  OptimizationGoal,
  OptimizationRequest,
  OptimizedBuildResult,
  PartSlot,
  VersionCatalog,
} from '@/types/silentgear';
import { calculateGearStats } from './calculator';

function computeScore(
  stats: ReturnType<typeof calculateGearStats>,
  goal: OptimizationGoal,
  gearType: GearType
): number {
  switch (goal) {
    case 'max_damage':
      return stats.meleeDamage * 10 + stats.dps * 2 + stats.durability * 0.005;
    case 'max_dps':
      return stats.dps * 12 + stats.meleeDamage * 4 + stats.durability * 0.005;
    case 'max_durability':
      return stats.durability * 1.0 + stats.meleeDamage * 1.5 + stats.armor * 2;
    case 'max_protection':
      return stats.armor * 10 + stats.armorToughness * 15 + stats.magicArmor * 8 + stats.durability * 0.02;
    case 'max_harvest':
      return stats.harvestSpeed * 12 + stats.durability * 0.01 + (stats.harvestTier.includes('netherite') ? 20 : 0);
    case 'balanced':
    default:
      if (gearType.category === 'armor') {
        return stats.armor * 8 + stats.armorToughness * 10 + stats.durability * 0.05;
      }
      return stats.meleeDamage * 6 + stats.dps * 4 + stats.durability * 0.02 + stats.harvestSpeed * 3;
  }
}

function generateHighlights(
  stats: ReturnType<typeof calculateGearStats>,
  goal: OptimizationGoal,
  gearType: GearType
): string[] {
  const highlights: string[] = [];

  if (stats.synergy >= 105) {
    highlights.push(`Harmonia elevada: ${stats.synergy}% de sinergia`);
  }

  if (goal === 'max_damage' || goal === 'max_dps') {
    highlights.push(`Dano por golpe: ${stats.meleeDamage} (${stats.dps} DPS)`);
  } else if (goal === 'max_durability') {
    highlights.push(`Durabilidade extrema: ${stats.durability} usos`);
  } else if (goal === 'max_protection') {
    highlights.push(`Proteção: ${stats.armor} de Armadura, ${stats.armorToughness} de Tenacidade`);
  } else if (goal === 'max_harvest') {
    highlights.push(`Velocidade de mineração: ${stats.harvestSpeed}`);
  }

  if (stats.traits.length > 0) {
    const traitNames = stats.traits.slice(0, 2).map((t) => `${t.name.pt || t.name.en} ${t.level}`).join(', ');
    highlights.push(`Traits ativados: ${traitNames}`);
  }

  return highlights;
}

export const MAX_SECONDARY_CANDIDATES = 12;

export function findBestBuilds(
  request: OptimizationRequest,
  catalog: VersionCatalog,
  topN: number = 3,
  maxSecondaryCandidates: number = MAX_SECONDARY_CANDIDATES
): OptimizedBuildResult[] {
  const gearType = catalog.gearTypes[request.gearTypeId];
  if (!gearType) {
    throw new Error(`GearType '${request.gearTypeId}' not found.`);
  }

  // Filtrar materiais permitidos
  const availableSet = new Set(request.availableMaterials);
  const eligibleMaterials = Object.values(catalog.materials).filter((m) =>
    availableSet.has(m.id)
  );

  if (eligibleMaterials.length === 0) {
    return [];
  }

  // Slots obrigatórios e slots opcionais chave
  const slotsToFill: PartSlot[] = [...gearType.requiredSlots];
  // Adiciona slot 'tip' se for ferramenta/arma e estiver disponível em algum material
  if (['weapon', 'tool'].includes(gearType.category) && !slotsToFill.includes('tip')) {
    const hasTip = eligibleMaterials.some((m) => !!m.stats.tip);
    if (hasTip) slotsToFill.push('tip');
  }

  // Candidatos viáveis por slot
  const candidatesBySlot: Partial<Record<PartSlot, string[]>> = {};

  for (const slot of slotsToFill) {
    // Se o usuário fixou o slot, usa apenas a escolha dele
    if (request.fixedSlots?.[slot]) {
      candidatesBySlot[slot] = [request.fixedSlots[slot]!];
      continue;
    }

    let valid = eligibleMaterials.filter((m) => {
      if (slot === 'main') return !!m.stats.main;
      if (slot === 'rod') return !!m.stats.rod || !!m.statModifiers?.rod;
      if (slot === 'tip') return !!m.stats.tip;
      return !!m.stats[slot];
    });

    if (slot !== 'main') {
      // Ordenar candidatos secundários pela contribuição individual ao objetivo
      const scoredCandidates = valid.map((m) => {
        const stats = calculateGearStats(
          {
            gearTypeId: request.gearTypeId,
            parts: { [slot]: { materialId: m.id } },
          },
          catalog
        );
        return {
          material: m,
          score: computeScore(stats, request.goal, gearType),
        };
      });

      scoredCandidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.material.id.localeCompare(b.material.id);
      });

      // Poda: se houver mais candidatos que o teto para slot secundário, pegar os melhores
      if (scoredCandidates.length > maxSecondaryCandidates) {
        valid = scoredCandidates.slice(0, maxSecondaryCandidates).map((c) => c.material);
      } else {
        valid = scoredCandidates.map((c) => c.material);
      }
    }

    candidatesBySlot[slot] = valid.map((m) => m.id);
  }

  // Garantir que todos os slots obrigatórios têm pelo menos 1 candidato
  for (const slot of gearType.requiredSlots) {
    if (!candidatesBySlot[slot] || candidatesBySlot[slot]!.length === 0) {
      return [];
    }
  }

  const results: OptimizedBuildResult[] = [];

  // Produto cartesiano para avaliação de combinações
  function explore(slotIndex: number, currentParts: Partial<Record<PartSlot, { materialId: string }>>) {
    if (slotIndex >= slotsToFill.length) {
      const build: GearBuild = {
        gearTypeId: request.gearTypeId,
        parts: { ...currentParts },
      };
      const stats = calculateGearStats(build, catalog);
      const score = computeScore(stats, request.goal, gearType);
      const highlights = generateHighlights(stats, request.goal, gearType);

      results.push({
        build,
        stats,
        score,
        summaryHighlights: highlights,
      });
      return;
    }

    const currentSlot = slotsToFill[slotIndex];
    const slotCandidates = candidatesBySlot[currentSlot] || [];

    // Se for opcional e não tiver candidatos, pula
    if (slotCandidates.length === 0) {
      explore(slotIndex + 1, currentParts);
      return;
    }

    for (const matId of slotCandidates) {
      currentParts[currentSlot] = { materialId: matId };
      explore(slotIndex + 1, currentParts);
    }
    delete currentParts[currentSlot];
  }

  explore(0, {});

  // Ordenar decrescente pelo score e retornar Top N
  results.sort((a, b) => b.score - a.score);

  // Deduplicar builds equivalentes e retornar top N
  return results.slice(0, topN);
}
