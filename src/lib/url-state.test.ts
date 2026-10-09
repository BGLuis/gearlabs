import { describe, it, expect } from 'vitest';
import LZString from 'lz-string';
import { encodeBuildToHash, decodeBuildFromHash } from './url-state';
import { GearBuild } from '@/types/silentgear';
import { ATM11_CATALOG } from '@/data/defaultCatalog';
import { validateAlloy } from './parts';

describe('url-state', () => {
  it('codifica e decodifica uma montagem perfeitamente', () => {
    const build: GearBuild = {
      gearTypeId: 'sword',
      parts: {
        main: { materialId: 'silentgear:diamond', grade: 'S' },
        rod: { materialId: 'silentgear:iron', grade: 'NONE' },
        tip: { materialId: 'silentgear:netherite', grade: 'MAX' },
      },
    };

    const hash = encodeBuildToHash(build, '1.20.1');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(10);
    expect(hash.length).toBeLessThan(250); // Super compacto!

    const decoded = decodeBuildFromHash(hash);
    expect(decoded).not.toBeNull();
    expect(decoded?.version).toBe('1.20.1');
    expect(decoded?.build.gearTypeId).toBe('sword');
    expect(decoded?.build.parts.main?.materialId).toBe('silentgear:diamond');
    expect(decoded?.build.parts.main?.grade).toBe('S');
    expect(decoded?.build.parts.rod?.materialId).toBe('silentgear:iron');
    expect(decoded?.build.parts.tip?.materialId).toBe('silentgear:netherite');
    expect(decoded?.build.parts.tip?.grade).toBe('MAX');
  });

  it('codifica e decodifica níveis de Starcharge (Starlight Charger) nos slots', () => {
    const build: GearBuild = {
      gearTypeId: 'helmet',
      parts: {
        main: { materialId: 'silentgear:unobtainium', grade: 'MAX', starcharge: 3 },
        coating: { materialId: 'silentgear:netherite', starcharge: 2 },
      },
    };

    const hash = encodeBuildToHash(build, 'atm11');
    const decoded = decodeBuildFromHash(hash);

    expect(decoded).not.toBeNull();
    expect(decoded?.build.parts.main?.starcharge).toBe(3);
    expect(decoded?.build.parts.main?.grade).toBe('MAX');
    expect(decoded?.build.parts.coating?.starcharge).toBe(2);
  });

  it('migra builds antigas de URL: se só os submaterials tinham grau, não propaga para a parte', () => {
    // Build legada onde data.g não existia, mas data.mats tinha { m: '...', g: 'MAX' }
    const oldPayload = {
      v: 'atm11',
      t: 'chestplate',
      p: {
        main: {
          m: 'silentgear:tyrian_steel',
          mats: [
            { m: 'silentgear:tyrian_steel', g: 'MAX' },
            { m: 'silentgear:unobtainium', g: 'MAX' },
          ],
        },
      },
    };
    const json = JSON.stringify(oldPayload);
    const hash = LZString.compressToEncodedURIComponent(json);

    const decoded = decodeBuildFromHash(hash);
    expect(decoded).not.toBeNull();
    expect(decoded?.build.parts.main?.grade).toBe('NONE');
    expect(decoded?.build.parts.main?.materials?.[0].materialId).toBe('silentgear:tyrian_steel');
  });

  it('preserva o grau da liga ao codificar e decodificar', () => {
    const build: GearBuild = {
      gearTypeId: 'chestplate',
      parts: {
        main: {
          materialId: 'silentgear:tyrian_steel',
          grade: 'MAX',
          starcharge: 3,
          materials: [
            { materialId: 'silentgear:tyrian_steel' },
            { materialId: 'silentgear:unobtainium' },
          ],
        },
      },
    };

    const hash = encodeBuildToHash(build, 'atm11');
    const decoded = decodeBuildFromHash(hash);

    expect(decoded).not.toBeNull();
    expect(decoded?.build.parts.main?.grade).toBe('MAX');
    expect(decoded?.build.parts.main?.starcharge).toBe(3);
    expect(decoded?.build.parts.main?.materials).toHaveLength(2);
  });

  it('codifica e decodifica alloyType nas partes compostas', () => {
    const build: GearBuild = {
      gearTypeId: 'sword',
      parts: {
        main: {
          materialId: 'silentgear:iron',
          alloyType: 'crude',
          materials: [
            { materialId: 'silentgear:iron' },
            { materialId: 'silentgear:wool' },
          ],
        },
      },
    };

    const hash = encodeBuildToHash(build, 'atm11');
    const decoded = decodeBuildFromHash(hash);

    expect(decoded).not.toBeNull();
    expect(decoded?.build.parts.main?.alloyType).toBe('crude');
    expect(decoded?.build.parts.main?.materials).toHaveLength(2);
  });

  it('uma build antiga de URL que viola a regra carrega com aviso, sem erro (Critério 3)', () => {
    // Build legada (sem campo 'a') com combinação ferro + lã que viola a regra padrão (metal/Alloy Forge)
    const legacyPayload = {
      v: 'atm11',
      t: 'sword',
      p: {
        main: {
          m: 'silentgear:iron',
          mats: [
            { m: 'silentgear:iron' },
            { m: 'silentgear:wool' },
          ],
        },
      },
    };

    const json = JSON.stringify(legacyPayload);
    const hash = LZString.compressToEncodedURIComponent(json);

    // Deve decodificar sem lançar erro
    expect(() => decodeBuildFromHash(hash)).not.toThrow();
    const decoded = decodeBuildFromHash(hash);

    expect(decoded).not.toBeNull();
    expect(decoded?.build.parts.main?.materials).toHaveLength(2);
    expect(decoded?.build.parts.main?.alloyType).toBe('metal'); // fallback legado

    const mainMats = decoded!.build.parts.main!.materials!.map(
      (sub: any) => ATM11_CATALOG.materials[sub.materialId]
    );

    const validation = validateAlloy(mainMats, decoded!.build.parts.main!.alloyType!);
    expect(validation.valid).toBe(false);
    expect(validation.warnings.length).toBeGreaterThan(0);
    expect(validation.warnings[0]).toContain('não aceita');
  });

  describe('Issue #33: part material instances serialization and legacy migration', () => {
    it('migra build legada de URL sem "inst" povoando N instâncias repetidas com o grau da parte (Critério 2)', () => {
      // Build legada para peitoral (8 instâncias para slot main)
      const legacyPayload = {
        v: 'atm11',
        t: 'chestplate',
        p: {
          main: {
            m: 'silentgear:iron',
            g: 'MAX',
            s: 2,
          },
        },
      };

      const json = JSON.stringify(legacyPayload);
      const hash = LZString.compressToEncodedURIComponent(json);
      const decoded = decodeBuildFromHash(hash);

      expect(decoded).not.toBeNull();
      const mainPart = decoded?.build.parts.main;
      expect(mainPart).toBeDefined();
      expect(mainPart?.grade).toBe('MAX');
      expect(mainPart?.starcharge).toBe(2);

      // Critério 2: 8 instâncias repetidas com o grau da parte
      expect(mainPart?.instances).toHaveLength(8);
      for (const inst of mainPart!.instances!) {
        expect(inst.grade).toBe('MAX');
        expect(inst.starcharge).toBe(2);
      }
    });

    it('codifica e decodifica instâncias heterogêneas preservando graus e cargas individuais', () => {
      const build: GearBuild = {
        gearTypeId: 'chestplate',
        parts: {
          main: {
            materialId: 'silentgear:iron',
            grade: 'NONE',
            instances: [
              { grade: 'MAX', starcharge: 1 },
              { grade: 'MAX', starcharge: 1 },
              { grade: 'MAX', starcharge: 1 },
              { grade: 'MAX', starcharge: 1 },
              { grade: 'NONE', starcharge: 0 },
              { grade: 'NONE', starcharge: 0 },
              { grade: 'NONE', starcharge: 0 },
              { grade: 'NONE', starcharge: 0 },
            ],
          },
        },
      };

      const hash = encodeBuildToHash(build, 'atm11');
      const decoded = decodeBuildFromHash(hash);

      expect(decoded).not.toBeNull();
      const mainPart = decoded?.build.parts.main;
      expect(mainPart).toBeDefined();
      expect(mainPart?.instances?.[0]).toEqual({ grade: 'MAX', starcharge: 1 });
      expect(mainPart?.instances?.[3]).toEqual({ grade: 'MAX', starcharge: 1 });
      expect(mainPart?.instances?.[4].grade).toBe('NONE');
      expect(mainPart?.instances?.[4].starcharge).toBeUndefined();
      expect(mainPart?.instances?.[7].grade).toBe('NONE');
      expect(mainPart?.instances?.[7].starcharge).toBeUndefined();
    });
  });
});

