import { describe, it, expect } from 'vitest';
import {
  addPartSubMaterial,
  removePartSubMaterial,
  reorderPartSubMaterials,
  updatePartSubMaterial,
  setPartSubMaterialsInPart,
  setPartAlloyTypeInPart,
  isMaterialAllowedInAlloy,
  validateAlloy,
  detectAlloyType,
  getMaxSubMaterials,
  ALLOY_CONFIGS,
} from './parts';
import { GearPartSelection, Material } from '@/types/silentgear';
import { ATM11_CATALOG } from '@/data/defaultCatalog';

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

describe('alloy rules, machine limits and validation (Issue #30)', () => {
  const iron = ATM11_CATALOG.materials['silentgear:iron']!;
  const gold = ATM11_CATALOG.materials['silentgear:gold']!;
  const wool = ATM11_CATALOG.materials['silentgear:wool']!;
  const diamond = ATM11_CATALOG.materials['silentgear:diamond']!;

  it('a validação rejeita ferro + lã no tipo metal e aceita ferro + ouro; aceita ferro + lã no tipo crua (Critério 1)', () => {
    expect(iron).toBeDefined();
    expect(gold).toBeDefined();
    expect(wool).toBeDefined();

    // Validação tipo metal (Alloy Forge)
    const metalWithWool = validateAlloy([iron, wool], 'metal', 'pt');
    expect(metalWithWool.valid).toBe(false);
    expect(metalWithWool.incompatibleMaterials.map((m) => m.id)).toContain('silentgear:wool');
    expect(metalWithWool.errors.length).toBeGreaterThan(0);
    expect(metalWithWool.errors[0]).toContain('não aceita');

    const metalWithGold = validateAlloy([iron, gold], 'metal', 'pt');
    expect(metalWithGold.valid).toBe(true);
    expect(metalWithGold.errors).toHaveLength(0);

    // Validação tipo crua (Crude Mixer)
    const crudeWithWool = validateAlloy([iron, wool], 'crude', 'pt');
    expect(crudeWithWool.valid).toBe(true);
    expect(crudeWithWool.errors).toHaveLength(0);
  });

  it('liga crua rejeita o 5º material e a super liga aceita até 8 (Critério 2)', () => {
    const mats4: Material[] = [iron, gold, wool, diamond];
    const mats5: Material[] = [...mats4, iron];

    // Crude Mixer: max 4
    const crude4 = validateAlloy(mats4, 'crude', 'pt');
    expect(crude4.valid).toBe(true);
    expect(crude4.exceedsLimit).toBe(false);

    const crude5 = validateAlloy(mats5, 'crude', 'pt');
    expect(crude5.valid).toBe(false);
    expect(crude5.exceedsLimit).toBe(true);
    expect(crude5.errors[0]).toContain('suporta no máximo 4 materiais');

    // addPartSubMaterial respeita limite de 4 na crua
    let crudePart: GearPartSelection = { materialId: iron.id, alloyType: 'crude' };
    crudePart = addPartSubMaterial(crudePart, gold.id, 'crude');
    crudePart = addPartSubMaterial(crudePart, wool.id, 'crude');
    crudePart = addPartSubMaterial(crudePart, diamond.id, 'crude');
    expect(crudePart.materials).toHaveLength(4);

    // Tentativa de adicionar o 5º deve ser rejeitada
    const crudeOverflow = addPartSubMaterial(crudePart, 'silentgear:copper', 'crude');
    expect(crudeOverflow.materials).toHaveLength(4);

    // Super Mixer: aceita até 8 materiais
    const mats8: Material[] = [iron, gold, wool, diamond, iron, gold, wool, diamond];
    const super8 = validateAlloy(mats8, 'super', 'pt');
    expect(super8.valid).toBe(true);
    expect(super8.exceedsLimit).toBe(false);

    const mats9: Material[] = [...mats8, iron];
    const super9 = validateAlloy(mats9, 'super', 'pt');
    expect(super9.valid).toBe(false);
    expect(super9.exceedsLimit).toBe(true);

    // addPartSubMaterial na super aceita 8 materiais
    let superPart: GearPartSelection = { materialId: iron.id, alloyType: 'super' };
    for (let i = 0; i < 7; i++) {
      superPart = addPartSubMaterial(superPart, gold.id, 'super');
    }
    expect(superPart.materials).toHaveLength(8);
    const superOverflow = addPartSubMaterial(superPart, diamond.id, 'super');
    expect(superOverflow.materials).toHaveLength(8);
  });

  it('recristalizador (gem) aceita gem/dust e rejeita metal; refabricador (fabric) aceita cloth e rejeita metal', () => {
    expect(isMaterialAllowedInAlloy(diamond, 'gem')).toBe(true);
    expect(isMaterialAllowedInAlloy(iron, 'gem')).toBe(false);

    expect(isMaterialAllowedInAlloy(wool, 'fabric')).toBe(true);
    expect(isMaterialAllowedInAlloy(iron, 'fabric')).toBe(false);

    const gemValid = validateAlloy([diamond], 'gem');
    expect(gemValid.valid).toBe(true);

    const gemInvalid = validateAlloy([diamond, iron], 'gem');
    expect(gemInvalid.valid).toBe(false);
    expect(gemInvalid.incompatibleMaterials.map((m) => m.id)).toContain('silentgear:iron');

    const fabricValid = validateAlloy([wool], 'fabric');
    expect(fabricValid.valid).toBe(true);

    const fabricInvalid = validateAlloy([wool, iron], 'fabric');
    expect(fabricInvalid.valid).toBe(false);
    expect(fabricInvalid.incompatibleMaterials.map((m) => m.id)).toContain('silentgear:iron');
  });

  it('detectAlloyType infere corretamente o tipo de liga pelas categorias', () => {
    expect(detectAlloyType([iron, gold])).toBe('metal');
    expect(detectAlloyType([diamond])).toBe('gem');
    expect(detectAlloyType([wool])).toBe('fabric');
    expect(detectAlloyType([iron, wool])).toBe('crude');
    expect(detectAlloyType([iron, gold, diamond, wool, iron, gold, diamond])).toBe('super');
  });

  it('setPartAlloyTypeInPart atualiza o alloyType da peça preservando os outros dados', () => {
    const part: GearPartSelection = {
      materialId: 'silentgear:iron',
      grade: 'A',
      starcharge: 2,
      alloyType: 'metal',
      materials: [{ materialId: 'silentgear:iron' }, { materialId: 'silentgear:gold' }],
    };

    const updated = setPartAlloyTypeInPart(part, 'crude');
    expect(updated.alloyType).toBe('crude');
    expect(updated.grade).toBe('A');
    expect(updated.starcharge).toBe(2);
    expect(updated.materials).toHaveLength(2);
  });
});
