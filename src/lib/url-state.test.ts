import { describe, it, expect } from 'vitest';
import LZString from 'lz-string';
import { encodeBuildToHash, decodeBuildFromHash } from './url-state';
import { GearBuild } from '@/types/silentgear';

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
});
