import { describe, it, expect } from 'vitest';
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
});
