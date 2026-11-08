import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { RUNS, buildProbeJar, kubegroovyFiles } from '../scripts/order-probe/generate';

describe('#106: gerador dos jars-sonda de ordem de camadas', () => {
  it('define as seis rodadas do spike, numeradas de 1 a 6', () => {
    expect(RUNS.map((r) => r.run)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('cada jar-sonda é só neoforge.mods.toml mais o material order_probe, em lowcodefml', async () => {
    const run = RUNS[0];
    const zip = await JSZip.loadAsync(await buildProbeJar(run, run.probes[0]));
    expect(Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort()).toEqual([
      'META-INF/neoforge.mods.toml',
      'data/silentgear/silentgear_materials/order_probe.json',
    ]);
    const toml = await zip.file('META-INF/neoforge.mods.toml')!.async('string');
    expect(toml).toContain('modLoader="lowcodefml"');
    expect(toml).toContain(`modId="${run.probes[0].modId}"`);
  });

  it('o material de cada sonda tem nome distinto e usa só ingrediente vanilla', async () => {
    const run = RUNS[0];
    const names = new Set<string>();
    for (const probe of run.probes) {
      const zip = await JSZip.loadAsync(await buildProbeJar(run, probe));
      const text = await zip.file('data/silentgear/silentgear_materials/order_probe.json')!.async('string');
      const json = JSON.parse(text);
      expect(json.crafting.ingredient).toMatch(/^minecraft:/);
      names.add(json.display.name.text);
    }
    expect(names.size).toBe(run.probes.length);
  });

  it('a rodada 2 inverte a ordem alfabética dos nomes de arquivo em relação à 1', () => {
    const files = (n: number) => RUNS[n - 1].probes.map((p) => [p.modId, p.fileName]);
    const r1 = files(1).sort((a, b) => a[0].localeCompare(b[0])).map((p) => p[1]);
    const r2 = files(2).sort((a, b) => a[0].localeCompare(b[0])).map((p) => p[1]);
    expect(r1).toEqual([...r1].sort());
    expect(r2).toEqual([...r2].sort().reverse());
  });

  it('as rodadas 3 e 4 declaram ordering AFTER e BEFORE entre as sondas; a 5 declara silentgear AFTER', async () => {
    const toml = async (n: number, idx: number) => {
      const run = RUNS[n - 1];
      const zip = await JSZip.loadAsync(await buildProbeJar(run, run.probes[idx]));
      return zip.file('META-INF/neoforge.mods.toml')!.async('string');
    };
    expect(await toml(3, 1)).toMatch(/modId="aaa_probe"[\s\S]*?ordering="AFTER"/);
    expect(await toml(4, 1)).toMatch(/modId="aaa_probe"[\s\S]*?ordering="BEFORE"/);
    expect(await toml(5, 1)).toMatch(/modId="silentgear"[\s\S]*?ordering="AFTER"/);
    expect(await toml(1, 0)).not.toContain('[[dependencies.aaa_probe]]\nmodId="aaa_probe"');
  });

  it('na rodada 5 zzz_probe também sobrescreve silentgear:iron, que o jar do Silent Gear já define', async () => {
    const run = RUNS[4];
    const zzz = run.probes.find((p) => p.modId === 'zzz_probe')!;
    const zip = await JSZip.loadAsync(await buildProbeJar(run, zzz));
    const iron = JSON.parse(await zip.file('data/silentgear/silentgear_materials/iron.json')!.async('string'));
    expect(iron.display.name.text).toBe('Probe ZZZ iron');
    for (const r of RUNS.filter((r) => r.run !== 5)) {
      for (const p of r.probes) {
        const z = await JSZip.loadAsync(await buildProbeJar(r, p));
        expect(z.file('data/silentgear/silentgear_materials/iron.json')).toBeNull();
      }
    }
  });

  it('a rodada 6 traz o material do KubeGroovy com índice próprio', () => {
    const files = kubegroovyFiles();
    expect(Object.keys(files).sort()).toEqual([
      'dynamic_data/index.json',
      'dynamic_data/silentgear/silentgear_materials/order_probe.json',
    ]);
    expect(files['dynamic_data/index.json']).toContain('silentgear/silentgear_materials/order_probe.json');
  });
});
