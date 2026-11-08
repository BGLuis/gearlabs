/**
 * Guia interativo do spike #106: monta a instância mínima, troca os mods de cada rodada,
 * pede o `/sgear_mats dump`, confere o resultado e grava o fixture + .meta.json.
 *
 * Uso: npx tsx scripts/order-probe/guide.ts [--from N] [--only N]
 *
 * Só lê a instância `ATM 11` (para copiar jars) e escreve na instância mínima que você indicar.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createHash } from 'crypto';
import { createInterface } from 'readline/promises';
import { RUNS, Run, buildProbeJar, kubegroovyFiles } from './generate';
import { buildRunMeta, probeRows, trackedIds } from './fixtures';

const INSTANCES_DIR = path.join(os.homedir(), '.local/share/PrismLauncher/instances');
const REAL_INSTANCE = path.join(INSTANCES_DIR, 'ATM 11');
const REAL_MODS = path.join(REAL_INSTANCE, 'minecraft', 'mods');
const FIXTURES = path.resolve(__dirname, '../../tests/fixtures');
const SILENT_GEAR_SHA1 = 'f0e1d83ebb243990ffa3ceac22f807b016364fdf';
const BASE_JARS = ['silent-lib-26.1.2-neoforge-11.2.0.jar', 'silent-gear-26.1.2-neoforge-4.2.3.jar'];
const KUBEGROOVY_JAR = 'kubegroovy-neoforge-1.0.1+26.1.2-neoforge.jar';
const PROBE_JAR = /^(aaa|zzz)-probe-.*\.jar$/;

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => rl.question(`\n${q} `);
const pause = (msg: string) => ask(`${msg} (Enter para continuar)`).then(() => undefined);
const sha = (algo: string, buf: Buffer) => createHash(algo).update(buf).digest('hex');
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? Number(process.argv[i + 1]) : undefined;
};

async function pickInstance(): Promise<string> {
  for (;;) {
    const name = (await ask('Nome da instância mínima nova no Prism (a pasta em ' + INSTANCES_DIR + '):')).trim();
    const dir = path.resolve(INSTANCES_DIR, name);
    if (!name) continue;
    if (dir === REAL_INSTANCE || path.dirname(dir) !== INSTANCES_DIR) {
      console.log('Escolha uma instância nova dentro da pasta do Prism, nunca a ATM 11.');
      continue;
    }
    const mc = ['minecraft', '.minecraft'].map((d) => path.join(dir, d)).find((d) => fs.existsSync(d));
    if (!mc) {
      console.log(`Não achei ${dir}/minecraft. Crie a instância no Prism (Minecraft 26.1.2 + NeoForge 26.1.2.126), rode-a uma vez até o menu e feche.`);
      await pause('Quando estiver pronta');
      if (!['minecraft', '.minecraft'].some((d) => fs.existsSync(path.join(dir, d)))) continue;
    }
    return ['minecraft', '.minecraft'].map((d) => path.join(dir, d)).find((d) => fs.existsSync(d))!;
  }
}

function setupBase(mc: string): void {
  const mods = path.join(mc, 'mods');
  fs.mkdirSync(mods, { recursive: true });
  for (const jar of BASE_JARS) {
    const src = path.join(REAL_MODS, jar);
    if (jar.startsWith('silent-gear')) {
      const got = sha('sha1', fs.readFileSync(src));
      if (got !== SILENT_GEAR_SHA1) throw new Error(`${jar} da instância real tem sha1 ${got}, esperado ${SILENT_GEAR_SHA1}`);
    }
    fs.copyFileSync(src, path.join(mods, jar));
  }
  const extra = fs.readdirSync(mods).filter((f) => !BASE_JARS.includes(f) && !PROBE_JAR.test(f) && f !== KUBEGROOVY_JAR);
  if (extra.length) console.log(`Aviso: há outros arquivos em mods/ que podem interferir no dump: ${extra.join(', ')}`);
}

function syncRun(mc: string, run: Run, jars: Map<string, Buffer>): void {
  const mods = path.join(mc, 'mods');
  for (const f of fs.readdirSync(mods)) if (PROBE_JAR.test(f) || f === KUBEGROOVY_JAR) fs.rmSync(path.join(mods, f));
  for (const [name, buf] of jars) fs.writeFileSync(path.join(mods, name), buf);
  fs.rmSync(path.join(mc, 'kubegroovy'), { recursive: true, force: true });
  if (run.kubegroovy) {
    fs.copyFileSync(path.join(REAL_MODS, KUBEGROOVY_JAR), path.join(mods, KUBEGROOVY_JAR));
    for (const [rel, content] of Object.entries(kubegroovyFiles())) {
      const target = path.join(mc, 'kubegroovy', rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
    }
  }
  fs.rmSync(path.join(mc, 'output/silentgear/material_export.tsv'), { force: true });
}

function logLoaded(mc: string, run: Run): string[] {
  const log = path.join(mc, 'logs/latest.log');
  const text = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
  return run.probes.map((p) => p.modId).filter((id) => !text.includes(id));
}

async function doRun(mc: string, run: Run): Promise<boolean> {
  console.log(`\n=== Rodada ${run.run} de ${RUNS.length}: ${run.description}`);
  const jars = new Map<string, Buffer>();
  for (const p of run.probes) jars.set(p.fileName, await buildProbeJar(run, p));
  syncRun(mc, run, jars);
  console.log(`Copiei para mods/: ${[...jars.keys()].join(', ')}${run.kubegroovy ? ` e ${KUBEGROOVY_JAR}, e criei kubegroovy/dynamic_data/` : ''}.`);
  console.log('Agora, no jogo:\n  1. Abra a instância mínima no Prism (feche o jogo se já estava aberto).\n  2. Entre em um mundo criativo (pode reaproveitar o mesmo).\n  3. Rode /sgear_mats dump\n  4. Feche o jogo.');
  await pause('Quando fechar o jogo');

  const tsvPath = path.join(mc, 'output/silentgear/material_export.tsv');
  if (!fs.existsSync(tsvPath)) {
    console.log(`Não achei ${tsvPath}. O dump não foi gerado.`);
    return false;
  }
  const tsv = fs.readFileSync(tsvPath);
  const missing = logLoaded(mc, run);
  if (missing.length) console.log(`Aviso: ${missing.join(', ')} não aparece em logs/latest.log; o mod pode não ter carregado.`);
  for (const id of trackedIds(run)) {
    const rows = probeRows(tsv.toString('utf8'), id);
    console.log(`${id}: ${rows.length ? rows.map((r) => `${r.pack} | ${r.name} | ${r.traits}`).join('\n    ') : 'NENHUMA linha no dump'}`);
  }
  if (!probeRows(tsv.toString('utf8'), 'silentgear:order_probe').length) {
    console.log('O dump não tem silentgear:order_probe. Veja se as sondas carregaram (logs/latest.log).');
    return false;
  }
  if ((await ask('Gravar esse dump como fixture da rodada? [S/n/refazer]')).trim().toLowerCase().startsWith('r')) return doRun(mc, run);
  const hashes = Object.fromEntries([...jars].map(([n, b]) => [n, sha('sha256', b)]));
  const base = path.join(FIXTURES, `material_export.probe-106-run${run.run}`);
  fs.copyFileSync(tsvPath, `${base}.tsv`);
  const meta = buildRunMeta(run, tsv, hashes, new Date().toISOString().slice(0, 10));
  fs.writeFileSync(`${base}.meta.json`, JSON.stringify(meta, null, 2) + '\n');
  console.log(`Gravado: ${path.relative(process.cwd(), base)}.{tsv,meta.json}`);
  return true;
}

async function main(): Promise<void> {
  console.log('Guia do spike #106. Nada é escrito na instância ATM 11; ela só é lida para copiar os jars.');
  const mc = await pickInstance();
  setupBase(mc);
  console.log(`Instância pronta em ${mc} (silent-lib e silent-gear 4.2.3 ${SILENT_GEAR_SHA1.slice(0, 7)}… copiados).`);
  const from = arg('--from') ?? 1;
  const only = arg('--only');
  for (const run of RUNS.filter((r) => (only ? r.run === only : r.run >= from))) {
    let ok = await doRun(mc, run);
    while (!ok && !(await ask('Tentar a rodada de novo? [S/n]')).trim().toLowerCase().startsWith('n')) {
      ok = await doRun(mc, run);
    }
  }
  console.log('\nPronto. Avise o agente do #106 que os dumps estão em tests/fixtures/.');
  rl.close();
}

main().catch((e) => {
  console.error(e);
  rl.close();
  process.exit(1);
});
