import {
  GearBuild,
  GearPartSelection,
  GearType,
  Grade,
  Material,
  OptimizationGoal,
  OptimizationRequest,
  OptimizedBuildResult,
  PartSlot,
  StarchargeLevel,
  VersionCatalog,
  AlloyType,
} from '@/types/silentgear';
import { calculateGearStats } from './calculator';
import { isCraftableMaterial, materialFitsSlot } from './materials';
import { ALLOY_LIMITS, isMaterialAllowedInAlloy } from './parts';

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
      return stats.armor * 100 + stats.armorToughness * 5 + stats.magicArmor * 0.5 + stats.durability * 0.00001;
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
  gearType: GearType,
  mainPart?: GearPartSelection
): string[] {
  const highlights: string[] = [];

  if (mainPart?.materials && mainPart.materials.length > 1) {
    highlights.push(`Liga de ${mainPart.materials.length} materiais (${stats.synergy}% harmonia)`);
  } else if (stats.synergy >= 105) {
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
// Cada slot opcional pode ficar vazio, então o espaço cresce multiplicativamente a cada slot opcional
export const MAX_OPTIONAL_CANDIDATES = 1;

// Máquinas com filtro de categoria; a crua e a super aceitam tudo e não entram na busca
const SEARCHED_ALLOY_TYPES: AlloyType[] = ['metal', 'gem', 'fabric'];

function beamSearchAlloys(
  allCandidates: Material[],
  alloyType: AlloyType,
  gearTypeId: string,
  goal: OptimizationGoal,
  gearType: GearType,
  catalog: VersionCatalog,
  targetGrade?: Grade,
  targetStarcharge?: StarchargeLevel,
  requestedMaxIngredients: number = 6,
  beamWidth: number = 6
): Array<{ score: number; part: GearPartSelection }> {
  const mainCandidates = allCandidates.filter((m) => isMaterialAllowedInAlloy(m, alloyType));
  const maxIngredients = Math.min(requestedMaxIngredients, ALLOY_LIMITS[alloyType]);
  if (mainCandidates.length < 2) return [];

  function makeAlloySelection(primaryId: string, subMatIds: string[]): GearPartSelection {
    const ordered = [primaryId, ...subMatIds.filter((id) => id !== primaryId)];
    // Grau e starcharge pertencem à liga inteira, não aos submateriais
    const part: GearPartSelection = {
      materialId: primaryId,
      alloyType,
      materials: ordered.map((id) => ({ materialId: id })),
    };
    if (targetGrade && targetGrade !== 'NONE') part.grade = targetGrade;
    if (targetStarcharge && targetStarcharge > 0) part.starcharge = targetStarcharge;
    return part;
  }

  function makePureSelection(materialId: string): GearPartSelection {
    const part: GearPartSelection = { materialId };
    if (targetGrade && targetGrade !== 'NONE') part.grade = targetGrade;
    if (targetStarcharge && targetStarcharge > 0) part.starcharge = targetStarcharge;
    return part;
  }

  // 1. Avaliar materiais puros para inicializar o feixe
  const scoredPure = mainCandidates.map((m) => {
    const part = makePureSelection(m.id);
    const stats = calculateGearStats({ gearTypeId, parts: { main: part } }, catalog);
    const score = computeScore(stats, goal, gearType);
    return {
      subMatIds: [m.id],
      primaryId: m.id,
      score,
      part,
    };
  });

  scoredPure.sort((a, b) => b.score - a.score);

  let beam = scoredPure.slice(0, beamWidth);
  const candidateAlloys: Array<{ score: number; part: GearPartSelection }> = [];

  const maxDepth = Math.min(maxIngredients, mainCandidates.length);

  for (let depth = 2; depth <= maxDepth; depth++) {
    const nextStates: Array<{
      subMatIds: string[];
      primaryId: string;
      score: number;
      part: GearPartSelection;
    }> = [];

    for (const b of beam) {
      for (const nextMat of mainCandidates) {
        if (b.subMatIds.includes(nextMat.id)) continue;
        const newIds = [...b.subMatIds, nextMat.id];

        // Avaliar com primário atual ou com o novo material como primário
        for (const prim of [b.primaryId, nextMat.id]) {
          const part = makeAlloySelection(prim, newIds);
          const stats = calculateGearStats({ gearTypeId, parts: { main: part } }, catalog);
          const score = computeScore(stats, goal, gearType);
          nextStates.push({
            subMatIds: newIds,
            primaryId: prim,
            score,
            part,
          });
        }
      }
    }

    if (nextStates.length === 0) break;

    // Deduplicar estados no mesmo nível de profundidade
    const seen = new Set<string>();
    const unique: typeof nextStates = [];
    for (const s of nextStates) {
      const key = [...s.subMatIds].sort().join(',') + '::' + s.primaryId;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }

    unique.sort((a, b) => b.score - a.score);
    beam = unique.slice(0, beamWidth);

    if (beam.length > 0) {
      candidateAlloys.push(beam[0]);
      if (beam.length > 1) candidateAlloys.push(beam[1]);
    }
  }

  // O primário muda o resultado (ordem de modificadores); reavalia cada conjunto finalista com todos os primários
  const finalistSets = new Map<string, string[]>();
  for (const item of candidateAlloys) {
    const ids = (item.part.materials || []).map((m) => m.materialId);
    finalistSets.set([...ids].sort().join(','), ids);
  }
  for (const ids of finalistSets.values()) {
    for (const primaryId of ids) {
      const part = makeAlloySelection(primaryId, ids);
      const stats = calculateGearStats({ gearTypeId, parts: { main: part } }, catalog);
      candidateAlloys.push({ score: computeScore(stats, goal, gearType), part });
    }
  }

  candidateAlloys.sort((a, b) => b.score - a.score);

  const result: Array<{ score: number; part: GearPartSelection }> = [];
  const seenAlloyKeys = new Set<string>();
  for (const item of candidateAlloys) {
    const key = (item.part.materials || []).map((m) => m.materialId).sort().join(',') + '::' + item.part.materialId;
    if (!seenAlloyKeys.has(key)) {
      seenAlloyKeys.add(key);
      result.push({ score: item.score, part: item.part });
    }
  }

  return result.slice(0, 3);
}

export function findBestBuilds(
  request: OptimizationRequest,
  catalog: VersionCatalog,
  topN: number = 3,
  maxSecondaryCandidates: number = MAX_SECONDARY_CANDIDATES,
  maxOptionalCandidates: number = MAX_OPTIONAL_CANDIDATES
): OptimizedBuildResult[] {
  const gearType = catalog.gearTypes[request.gearTypeId];
  if (!gearType) {
    throw new Error(`GearType '${request.gearTypeId}' not found.`);
  }
  const isArmor = gearType.category === 'armor';

  const targetGrade: Grade | undefined = request.grade ?? request.maxGrade;
  const targetStarcharge: StarchargeLevel | undefined = request.starcharge;
  const allowAlloys = request.allowAlloys ?? (targetGrade !== undefined || (targetStarcharge !== undefined && targetStarcharge > 0));
  const maxAlloyIngredients = request.maxAlloyIngredients ?? 6;

  function makePart(materialId: string): GearPartSelection {
    const part: GearPartSelection = { materialId };
    if (targetGrade && targetGrade !== 'NONE') part.grade = targetGrade;
    if (targetStarcharge && targetStarcharge > 0) part.starcharge = targetStarcharge;
    return part;
  }

  // Filtrar materiais permitidos e craftáveis
  const availableSet = new Set(request.availableMaterials);
  const eligibleMaterials = Object.values(catalog.materials).filter((m) =>
    availableSet.has(m.id) && isCraftableMaterial(m, request.gearTypeId)
  );

  if (eligibleMaterials.length === 0) {
    return [];
  }

  // Slots obrigatórios e slots opcionais com pelo menos um material elegível
  const slotsToFill: PartSlot[] = [...gearType.requiredSlots];
  for (const slot of gearType.optionalSlots) {
    if (slotsToFill.includes(slot)) continue;
    if (eligibleMaterials.some((m) => materialFitsSlot(m, slot, request.gearTypeId, isArmor)))
      slotsToFill.push(slot);
  }

  // Candidatos viáveis por slot
  const candidatePartsBySlot: Partial<Record<PartSlot, GearPartSelection[]>> = {};

  for (const slot of slotsToFill) {
    // Se o usuário fixou o slot, usa apenas a escolha dele com grade e starcharge aplicados
    if (request.fixedSlots?.[slot]) {
      const fixedPart = makePart(request.fixedSlots[slot]!);
      const fixedMaterial = catalog.materials[fixedPart.materialId];
      const isInvalidMain =
        slot === 'main' &&
        (!fixedMaterial || !materialFitsSlot(fixedMaterial, slot, request.gearTypeId, isArmor));
      candidatePartsBySlot[slot] = isInvalidMain ? [] : [fixedPart];
      continue;
    }

    const valid = eligibleMaterials.filter((m) =>
      materialFitsSlot(m, slot, request.gearTypeId, isArmor)
    );

    if (slot === 'main') {
      const pureCandidates = valid.map((m) => makePart(m.id));
      let alloyCandidates: GearPartSelection[] = [];

      if (allowAlloys && valid.length >= 2) {
        alloyCandidates = SEARCHED_ALLOY_TYPES.flatMap((alloyType) =>
          beamSearchAlloys(
            valid,
            alloyType,
            request.gearTypeId,
            request.goal,
            gearType,
            catalog,
            targetGrade,
            targetStarcharge,
            maxAlloyIngredients
          )
        )
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((c) => c.part);
      }

      candidatePartsBySlot[slot] = [...alloyCandidates, ...pureCandidates];
    } else {
      // Ordenar candidatos secundários pela contribuição individual ao objetivo com grade/starcharge
      const scoredCandidates = valid.map((m) => {
        const stats = calculateGearStats(
          {
            gearTypeId: request.gearTypeId,
            parts: { [slot]: makePart(m.id) },
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
      const cap = gearType.requiredSlots.includes(slot) ? maxSecondaryCandidates : maxOptionalCandidates;
      let selectedSecondary = scoredCandidates;
      if (scoredCandidates.length > cap) {
        selectedSecondary = scoredCandidates.slice(0, cap);
      }

      candidatePartsBySlot[slot] = selectedSecondary.map((c) => makePart(c.material.id));
    }
  }

  // Garantir que todos os slots obrigatórios têm pelo menos 1 candidato
  for (const slot of gearType.requiredSlots) {
    if (!candidatePartsBySlot[slot] || candidatePartsBySlot[slot]!.length === 0) {
      return [];
    }
  }

  const results: OptimizedBuildResult[] = [];

  // Produto cartesiano para avaliação de combinações
  function explore(slotIndex: number, currentParts: Partial<Record<PartSlot, GearPartSelection>>) {
    if (slotIndex >= slotsToFill.length) {
      const build: GearBuild = {
        gearTypeId: request.gearTypeId,
        parts: { ...currentParts },
      };
      const stats = calculateGearStats(build, catalog);
      const score = computeScore(stats, request.goal, gearType);
      const highlights = generateHighlights(stats, request.goal, gearType, currentParts.main);

      results.push({
        build,
        stats,
        score,
        summaryHighlights: highlights,
      });
      return;
    }

    const currentSlot = slotsToFill[slotIndex];
    const slotCandidates = candidatePartsBySlot[currentSlot] || [];

    // Se for opcional e não tiver candidatos, pula
    if (slotCandidates.length === 0) {
      explore(slotIndex + 1, currentParts);
      return;
    }

    for (const part of slotCandidates) {
      currentParts[currentSlot] = part;
      explore(slotIndex + 1, currentParts);
    }
    delete currentParts[currentSlot];
    // Slot opcional pode ficar vazio: a ponta, por exemplo, nem sempre melhora o objetivo
    const isOptional = !gearType.requiredSlots.includes(currentSlot) && !request.fixedSlots?.[currentSlot];
    if (isOptional) explore(slotIndex + 1, currentParts);
  }

  explore(0, {});

  // Ordenar decrescente pelo score
  results.sort((a, b) => b.score - a.score);

  // Top N com um representante por principal distinto; se faltarem principais, completa com as melhores restantes
  const seenBuilds = new Set<string>();
  const seenMains = new Set<string>();
  const selected: OptimizedBuildResult[] = [];
  const sameMainFallback: OptimizedBuildResult[] = [];
  for (const res of results) {
    const key = Object.entries(res.build.parts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slot, part]) => {
        const sub = part?.materials ? part.materials.map((m) => m.materialId).sort().join('+') : '';
        return `${slot}:${part?.materialId}:${sub}:${part?.grade ?? ''}:${part?.starcharge ?? ''}`;
      })
      .join('|');
    if (seenBuilds.has(key)) continue;
    seenBuilds.add(key);

    const mainKey = (res.build.parts.main?.materials ?? [{ materialId: res.build.parts.main?.materialId }])
      .map((m) => m.materialId)
      .sort()
      .join('+');
    if (seenMains.has(mainKey)) {
      sameMainFallback.push(res);
      continue;
    }
    seenMains.add(mainKey);
    selected.push(res);
    if (selected.length >= topN) break;
  }

  for (const res of sameMainFallback) {
    if (selected.length >= topN) break;
    selected.push(res);
  }

  return selected.sort((a, b) => b.score - a.score);
}
