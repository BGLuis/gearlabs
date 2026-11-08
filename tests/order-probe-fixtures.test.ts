import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { RUNS } from '../scripts/order-probe/generate';
import { buildRunMeta, probeRows } from '../scripts/order-probe/fixtures';

const HEADER = 'Pack\tName\tType\tID\tParent\tCategories\tAdditive\tTraits';
const tsv = [
  HEADER,
  'mod/silentgear\tIron\tMain\tsilentgear:iron\t\t\t\tSturdy I',
  'mod/zzz_probe\tProbe ZZZ\tMain\tsilentgear:order_probe\t\t\t\tCrushing I',
].join('\n');

describe('#106: meta dos dumps das rodadas', () => {
  it('lê o pacote vencedor, o nome e os traits da linha de um id', () => {
    expect(probeRows(tsv, 'silentgear:order_probe')).toEqual([{ pack: 'mod/zzz_probe', name: 'Probe ZZZ', traits: 'Crushing I' }]);
    expect(probeRows(tsv, 'silentgear:nada')).toEqual([]);
  });

  it('monta o meta com proveniência, config da rodada, hash do TSV e hash dos jars', () => {
    const run = RUNS[4];
    const meta = buildRunMeta(run, Buffer.from(tsv), { 'aaa-probe-1.0.0.jar': 'h1', 'zzz-probe-1.0.0.jar': 'h2' }, '2026-11-08');
    expect(meta).toMatchObject({
      source: '/sgear_mats dump',
      silentGearVersion: '4.2.3',
      minecraft: '26.1.2',
      modLoader: 'lowcodefml',
      run: 5,
      generatedAt: '2026-11-08',
      sha256: createHash('sha256').update(tsv).digest('hex'),
    });
    expect(meta.probes.map((p) => [p.modId, p.fileName, p.jarSha256])).toEqual([
      ['aaa_probe', 'aaa-probe-1.0.0.jar', 'h1'],
      ['zzz_probe', 'zzz-probe-1.0.0.jar', 'h2'],
    ]);
    expect(meta.winners['silentgear:order_probe']).toEqual([{ pack: 'mod/zzz_probe', name: 'Probe ZZZ', traits: 'Crushing I' }]);
    expect(meta.winners['silentgear:iron']).toHaveLength(1);
  });
});
