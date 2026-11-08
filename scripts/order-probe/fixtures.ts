import { createHash } from 'crypto';
import { MOD_LOADER, Run } from './generate';

export interface DumpRow {
  pack: string;
  name: string;
  traits: string;
}

/** Colunas do `/sgear_mats dump`: Pack(0), Name(1), Type(2), ID(3), …, Traits(7). */
export function probeRows(tsv: string, id: string): DumpRow[] {
  return tsv
    .split('\n')
    .map((line) => line.replace(/\r$/, '').split('\t'))
    .filter((cols) => cols[3] === id)
    .map((cols) => ({ pack: cols[0], name: cols[1], traits: cols[7] ?? '' }));
}

/** Ids cuja linha do dump registra o pacote vencedor na rodada. */
export function trackedIds(run: Run): string[] {
  const overridden = run.probes.flatMap((p) => p.overrides ?? []).map((id) => `silentgear:${id}`);
  return ['silentgear:order_probe', ...new Set(overridden)];
}

export function buildRunMeta(run: Run, tsv: Buffer, jarSha256: Record<string, string>, generatedAt: string) {
  const text = tsv.toString('utf8');
  return {
    source: '/sgear_mats dump',
    file: 'output/silentgear/material_export.tsv',
    instance: 'Instância mínima do spike #106 (Prism, só silent-lib, silent-gear 4.2.3 e as sondas)',
    minecraft: '26.1.2',
    silentGearVersion: '4.2.3',
    modLoader: MOD_LOADER,
    run: run.run,
    description: run.description,
    kubegroovy: run.kubegroovy ?? false,
    probes: run.probes.map((p) => ({
      modId: p.modId,
      fileName: p.fileName,
      label: p.label,
      trait: p.trait,
      dependencies: p.dependencies,
      overrides: p.overrides ?? [],
      jarSha256: jarSha256[p.fileName],
    })),
    winners: Object.fromEntries(trackedIds(run).map((id) => [id, probeRows(text, id)])),
    generatedAt,
    sha256: createHash('sha256').update(tsv).digest('hex'),
    note: 'Arquivo gravado pelo próprio jogo (não gerado pelo extrator). Gerado por scripts/order-probe/guide.ts; jars-sonda de scripts/order-probe/generate.ts, não versionados.',
  };
}
