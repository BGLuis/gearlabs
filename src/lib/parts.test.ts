import { describe, it, expect } from 'vitest';
import {
  addPartSubMaterial,
  removePartSubMaterial,
  reorderPartSubMaterials,
  updatePartSubMaterial,
  setPartSubMaterialsInPart,
} from './parts';
import { GearPartSelection } from '@/types/silentgear';

describe('parts pure transformations (Issue #28)', () => {
  it('partindo de uma parte com starcharge: 3, adicionar e remover submaterial mantém starcharge: 3', () => {
    const initialPart: GearPartSelection = {
      materialId: 'silentgear:crimson_steel',
      grade: 'MAX',
      starcharge: 3,
      materials: [
        { materialId: 'silentgear:crimson_steel' },
        { materialId: 'silentgear:azure_electrum' },
      ],
    };

    // Adiciona sub-material
    const afterAdd = addPartSubMaterial(initialPart, 'silentgear:tyrian_steel');
    expect(afterAdd.starcharge).toBe(3);
    expect(afterAdd.grade).toBe('MAX');
    expect(afterAdd.materials).toHaveLength(3);
    expect(afterAdd.materials?.[2].materialId).toBe('silentgear:tyrian_steel');

    // Remove sub-material recém-adicionado
    const afterRemove = removePartSubMaterial(afterAdd, 2);
    expect(afterRemove).not.toBeNull();
    expect(afterRemove!.starcharge).toBe(3);
    expect(afterRemove!.grade).toBe('MAX');
    expect(afterRemove!.materials).toHaveLength(2);

    // Remove outro sub-material restando apenas 1 (converte para material simples mantendo starcharge: 3)
    const afterRemoveToOne = removePartSubMaterial(afterRemove!, 1);
    expect(afterRemoveToOne).not.toBeNull();
    expect(afterRemoveToOne!.starcharge).toBe(3);
    expect(afterRemoveToOne!.grade).toBe('MAX');
    expect(afterRemoveToOne!.materialId).toBe('silentgear:crimson_steel');
    expect(afterRemoveToOne!.materials).toBeUndefined();
  });

  it('adicionar sub-material a parte simples com starcharge preserva o starcharge e grau', () => {
    const singlePart: GearPartSelection = {
      materialId: 'silentgear:iron',
      grade: 'S',
      starcharge: 2,
    };

    const compound = addPartSubMaterial(singlePart, 'silentgear:gold');
    expect(compound.starcharge).toBe(2);
    expect(compound.grade).toBe('S');
    expect(compound.materialId).toBe('silentgear:iron');
    expect(compound.materials).toEqual([
      { materialId: 'silentgear:iron' },
      { materialId: 'silentgear:gold' },
    ]);
  });

  it('não ultrapassa o limite máximo de 6 sub-materiais e preserva propriedades', () => {
    const part: GearPartSelection = {
      materialId: 'm1',
      materials: [
        { materialId: 'm1' },
        { materialId: 'm2' },
        { materialId: 'm3' },
        { materialId: 'm4' },
        { materialId: 'm5' },
        { materialId: 'm6' },
      ],
      starcharge: 1,
      grade: 'A',
    };

    const overflow = addPartSubMaterial(part, 'm7');
    expect(overflow.materials).toHaveLength(6);
    expect(overflow.starcharge).toBe(1);
    expect(overflow.grade).toBe('A');
  });

  it('removePartSubMaterial retorna null quando todos os sub-materiais são removidos', () => {
    const part: GearPartSelection = {
      materialId: 'm1',
      materials: [{ materialId: 'm1' }],
      starcharge: 3,
    };
    const result = removePartSubMaterial(part, 0);
    expect(result).toBeNull();
  });

  it('removePartSubMaterial com índice inválido não altera a parte', () => {
    const part: GearPartSelection = {
      materialId: 'm1',
      materials: [{ materialId: 'm1' }, { materialId: 'm2' }],
      starcharge: 3,
    };
    const resultOutOfBounds = removePartSubMaterial(part, 5);
    expect(resultOutOfBounds).toBe(part);

    const resultNegative = removePartSubMaterial(part, -1);
    expect(resultNegative).toBe(part);
  });

  it('reordena e atualiza sub-materiais preservando propriedades da parte (starcharge e grade)', () => {
    const part: GearPartSelection = {
      materialId: 'm1',
      starcharge: 3,
      grade: 'SS',
      materials: [{ materialId: 'm1' }, { materialId: 'm2' }],
    };

    const reordered = reorderPartSubMaterials(part, 0, 1);
    expect(reordered?.materialId).toBe('m2');
    expect(reordered?.starcharge).toBe(3);
    expect(reordered?.grade).toBe('SS');

    const updated = updatePartSubMaterial(reordered, 0, 'm3');
    expect(updated?.materialId).toBe('m3');
    expect(updated?.starcharge).toBe(3);
    expect(updated?.grade).toBe('SS');
  });

  it('setPartSubMaterialsInPart preserva starcharge e grade', () => {
    const current: GearPartSelection = {
      materialId: 'm1',
      grade: 'B',
      starcharge: 3,
    };

    const next = setPartSubMaterialsInPart(current, [
      { materialId: 'm2' },
      { materialId: 'm3' },
    ]);

    expect(next.materialId).toBe('m2');
    expect(next.grade).toBe('B');
    expect(next.starcharge).toBe(3);
    expect(next.materials).toEqual([{ materialId: 'm2' }, { materialId: 'm3' }]);
  });
});
