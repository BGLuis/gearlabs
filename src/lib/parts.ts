import { GearPartSelection, SubMaterialSelection } from '@/types/silentgear';

export const MAX_SUB_MATERIALS = 6;

/**
 * Adiciona um sub-material a uma parte, preservando grau e starcharge existentes.
 * Se o limite máximo (6) for atingido, retorna a parte inalterada.
 */
export function addPartSubMaterial(
  current: GearPartSelection | undefined,
  materialId: string
): GearPartSelection {
  const currentMaterials =
    current?.materials && current.materials.length > 0
      ? [...current.materials]
      : current?.materialId
        ? [{ materialId: current.materialId }]
        : [];

  if (currentMaterials.length >= MAX_SUB_MATERIALS) {
    return current || { materialId, grade: 'NONE', starcharge: 0 };
  }

  const newMaterials: SubMaterialSelection[] = [...currentMaterials, { materialId }];

  return {
    ...current,
    materialId: newMaterials[0].materialId,
    grade: current?.grade || 'NONE',
    starcharge: current?.starcharge || 0,
    materials: newMaterials,
  };
}

/**
 * Remove um sub-material de uma parte pelo índice.
 * - Retorna `null` se não restar nenhum sub-material (sinaliza remoção da parte).
 * - Se restar apenas 1 sub-material, converte de volta para material simples (materials: undefined).
 * - Preserva grau e starcharge existentes.
 */
export function removePartSubMaterial(
  current: GearPartSelection | undefined,
  index: number
): GearPartSelection | null {
  if (!current?.materials || index < 0 || index >= current.materials.length) {
    return current || null;
  }

  const nextMaterials = current.materials.filter((_, i) => i !== index);

  if (nextMaterials.length === 0) {
    return null;
  }

  return {
    ...current,
    materialId: nextMaterials[0].materialId,
    grade: current.grade || 'NONE',
    starcharge: current.starcharge || 0,
    materials: nextMaterials.length > 1 ? nextMaterials : undefined,
  };
}

/**
 * Reordena sub-materiais mantendo todos os metadados da parte.
 */
export function reorderPartSubMaterials(
  current: GearPartSelection | undefined,
  fromIndex: number,
  toIndex: number
): GearPartSelection | undefined {
  if (!current?.materials || fromIndex === toIndex) return current;
  if (
    fromIndex < 0 ||
    fromIndex >= current.materials.length ||
    toIndex < 0 ||
    toIndex >= current.materials.length
  ) {
    return current;
  }

  const nextMaterials = [...current.materials];
  const [moved] = nextMaterials.splice(fromIndex, 1);
  nextMaterials.splice(toIndex, 0, moved);

  return {
    ...current,
    materialId: nextMaterials[0].materialId,
    materials: nextMaterials,
  };
}

/**
 * Atualiza um sub-material específico mantendo grau e starcharge da parte.
 */
export function updatePartSubMaterial(
  current: GearPartSelection | undefined,
  index: number,
  materialId: string
): GearPartSelection | undefined {
  if (!current?.materials || index < 0 || index >= current.materials.length) return current;

  const nextMaterials = [...current.materials];
  nextMaterials[index] = { materialId };

  return {
    ...current,
    materialId: nextMaterials[0].materialId,
    materials: nextMaterials,
  };
}

/**
 * Define a lista completa de sub-materiais garantindo que starcharge e grau sejam preservados.
 */
export function setPartSubMaterialsInPart(
  current: GearPartSelection | undefined,
  materials: SubMaterialSelection[]
): GearPartSelection {
  const primary = materials[0];
  return {
    ...current,
    materialId: primary?.materialId || current?.materialId || '',
    grade: current?.grade || 'NONE',
    starcharge: current?.starcharge || 0,
    materials,
  };
}

// Aliases para conveniência
export {
  addPartSubMaterial as addSubMaterial,
  removePartSubMaterial as removeSubMaterial,
  reorderPartSubMaterials as reorderSubMaterials,
  updatePartSubMaterial as updateSubMaterial,
  setPartSubMaterialsInPart as setPartSubMaterials,
};
