import { describe, it, expect } from 'vitest';
import * as materialsLib from './materials';
import { calculateGearStats } from './calculator';
import { PartSlot, StatModifierEntry, VersionCatalog, Material } from '@/types/silentgear';
import atm11Json from '../../public/data/versions/atm11/catalog.json';

const atm11 = atm11Json as unknown as VersionCatalog;

/**
 * Auditoria #41/#52: a lista de materiais oferecida pelo SlotPicker e pelo otimizador vem de uma só função.
 */
const getSelectableMaterials = (
  materialsLib as unknown as {
    getSelectableMaterials: (c: VersionCatalog, gearTypeId: string, slot: PartSlot) => Material[];
  }
).getSelectableMaterials;

const numeric = (entry: StatModifierEntry | undefined): number =>
  typeof entry === 'object' && entry !== null ? Number((entry as { value: number }).value) : Number(entry ?? 0);

describe('Auditoria #52: materiais aditivos e sem durabilidade não são partes principais', () => {
  it.each([
    'silentgear:glowstone',
    'silentgear:redstone',
    'silentgear:crushed_shulker_shell',
  ])('%s (additive no jar) não é oferecido como parte principal da espada', (id) => {
    const ids = getSelectableMaterials(atm11, 'sword', 'main').map((m) => m.id);
    expect(ids).not.toContain(id);
  });

  it('todo material oferecido como parte principal de ferramenta tem durabilidade maior que zero', () => {
    const offending = getSelectableMaterials(atm11, 'sword', 'main')
      .filter((m) => numeric(m.stats.main?.durability) <= 0)
      .map((m) => m.id);
    expect(offending).toEqual([]);
  });
});

describe('Auditoria #41: todo material oferecido para armadura calcula sem erro', () => {
  it.each(['helmet', 'chestplate', 'leggings', 'boots'])('%s', (gearTypeId) => {
    const failing: string[] = [];
    for (const m of getSelectableMaterials(atm11, gearTypeId, 'main')) {
      try {
        calculateGearStats({ gearTypeId, parts: { main: { materialId: m.id } } }, atm11);
      } catch {
        failing.push(m.id);
      }
    }
    expect(failing).toEqual([]);
  });

  it('turtle só é oferecido para o capacete', () => {
    const offered = (gear: string) => getSelectableMaterials(atm11, gear, 'main').map((m) => m.id);
    expect(offered('helmet')).toContain('silentgear:turtle');
    expect(offered('chestplate')).not.toContain('silentgear:turtle');
  });
});
