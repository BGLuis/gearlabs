import { describe, it, expect } from 'vitest';
import { encodeBuildToHash, decodeBuildFromHash } from './url-state';
import { calculateGearStats } from './calculator';
import { GearBuild, VersionCatalog } from '@/types/silentgear';
import atm11Json from '../../public/data/versions/atm11/catalog.json';

const atm11 = atm11Json as unknown as VersionCatalog;

const ALLOY = [
  { materialId: 'silentgear:tyrian_steel' },
  { materialId: 'silentgear:unobtainium' },
  { materialId: 'sgearmetalworks:uru_metal' },
  { materialId: 'silentgear:vibranium' },
  { materialId: 'silentgear:allthemodium' },
];

describe('Auditoria #33: URL preserva starcharge por instância', () => {
  it('starcharge: 0 explícito numa instância não herda o starcharge da parte após o round-trip', () => {
    const build: GearBuild = {
      gearTypeId: 'chestplate',
      parts: {
        main: {
          materialId: 'silentgear:tyrian_steel',
          grade: 'MAX',
          starcharge: 3,
          materials: ALLOY,
          alloyType: 'metal',
          instances: [
            { grade: 'MAX', starcharge: 0 },
            { grade: 'MAX', starcharge: 0 },
            { grade: 'MAX', starcharge: 0 },
            { grade: 'MAX', starcharge: 0 },
            { grade: 'MAX', starcharge: 3 },
            { grade: 'MAX', starcharge: 3 },
            { grade: 'MAX', starcharge: 3 },
            { grade: 'MAX', starcharge: 3 },
          ],
        },
      },
    };

    const before = calculateGearStats(build, atm11);
    const decoded = decodeBuildFromHash(encodeBuildToHash(build, 'atm11'));
    expect(decoded).not.toBeNull();
    const after = calculateGearStats(decoded!.build, atm11);

    expect(after.armor).toBeCloseTo(before.armor, 2);
    expect(after.durability).toBe(before.durability);
  });
});
