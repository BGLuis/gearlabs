import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import type { CatalogIndex, CatalogSource } from '../src/types/silentgear';
import { isCatalogIndex } from '../src/lib/catalog-index';

/**
 * Compara a `main` do ATM-11 (só `modlist.json` e os scripts `silentgear_*` do kubegroovy,
 * sem baixar jar) com o `source` do catálogo `latest`. Ver o #99.
 */

const ATM11_REPO = 'AllTheMods/ATM-11';
const MODLIST_PATH = 'config/crash_assistant/modlist.json';
const SCRIPT_ROOTS = ['kubegroovy/dynamic_data/', 'kubejs/dynamic_data/', 'kubejs/data/'];
const SCRIPT_FILE = /\/silentgear_(materials|traits)\/[^/]+\.json$/;
const INACTIVITY_LIMIT_DAYS = 50;
const DAY_MS = 86_400_000;

/** Título da seção do README que explica como reativar o workflow. */
export const README_SECTION = 'check-atm11';

export interface ModlistEntry {
  jarName: string;
  modId?: string;
  version?: string;
  modrinthHash?: string;
}

export interface RemoteState {
  /** SHA do commit da `main` do ATM-11 lido */
  commit: string;
  modlist: Record<string, ModlistEntry>;
  /** caminho no repositório do ATM-11 → SHA-1 do conteúdo */
  scripts: Record<string, string>;
}

export type Difference =
  | { kind: 'jar-changed'; modId: string; from: string; to: string; fromVersion: string; toVersion: string }
  | { kind: 'jar-rebuilt'; jar: string; from: string; to: string }
  | { kind: 'jar-removed'; jar: string }
  | { kind: 'script-changed'; path: string; from: string; to: string }
  | { kind: 'script-added'; path: string }
  | { kind: 'script-removed'; path: string };

const sha1Of = (data: Buffer | string) => createHash('sha1').update(data).digest('hex');

/** O `modlist.json` do pack começa com BOM UTF-8, que o `JSON.parse` recusa. */
export function parseModlist(text: string): Record<string, ModlistEntry> {
  return JSON.parse(text.replace(/^﻿/, ''));
}

/** Os caminhos de `source.files` são relativos à raiz da instância; o repositório do pack é a pasta de jogo. */
const toRepoPath = (p: string) => p.replace(/^minecraft\//, '');

export function compareRemote(source: CatalogSource, remote: RemoteState): Difference[] {
  const diffs: Difference[] = [];
  const modlist = Object.values(remote.modlist);

  for (const file of source.files.filter((f) => f.kind === 'jar')) {
    const jar = path.posix.basename(file.path);
    const same = remote.modlist[jar];
    if (same) {
      if (same.modrinthHash && same.modrinthHash !== file.sha1) {
        diffs.push({ kind: 'jar-rebuilt', jar, from: file.sha1, to: same.modrinthHash });
      }
      continue;
    }
    const renamed = file.modId ? modlist.find((e) => e.modId === file.modId) : undefined;
    if (renamed) {
      diffs.push({
        kind: 'jar-changed',
        modId: renamed.modId!,
        from: jar,
        to: renamed.jarName,
        fromVersion: file.version ?? '?',
        toVersion: renamed.version ?? '?',
      });
    } else {
      diffs.push({ kind: 'jar-removed', jar });
    }
  }

  const known = new Map(source.files.filter((f) => f.kind === 'script-data').map((f) => [toRepoPath(f.path), f.sha1]));
  for (const [p, sha1] of known) {
    const now = remote.scripts[p];
    if (now === undefined) diffs.push({ kind: 'script-removed', path: p });
    else if (now !== sha1) diffs.push({ kind: 'script-changed', path: p, from: sha1, to: now });
  }
  for (const p of Object.keys(remote.scripts)) {
    if (!known.has(p)) diffs.push({ kind: 'script-added', path: p });
  }
  return diffs;
}

/** Identifica o conjunto de diferenças, para comentar na issue só quando ele muda. */
export function diffHash(diffs: Difference[]): string {
  return sha1Of(JSON.stringify(diffs.map((d) => JSON.stringify(d)).sort())).slice(0, 12);
}

function describeDifference(d: Difference): string {
  switch (d.kind) {
    case 'jar-changed':
      return `jar \`${d.modId}\`: \`${d.from}\` (${d.fromVersion}) → \`${d.to}\` (${d.toVersion})`;
    case 'jar-rebuilt':
      return `jar \`${d.jar}\`: mesmo nome, SHA-1 \`${d.from}\` → \`${d.to}\``;
    case 'jar-removed':
      return `jar \`${d.jar}\`: saiu do modlist.json`;
    case 'script-changed':
      return `script \`${d.path}\`: SHA-1 \`${d.from}\` → \`${d.to}\``;
    case 'script-added':
      return `script \`${d.path}\`: novo`;
    case 'script-removed':
      return `script \`${d.path}\`: removido`;
  }
}

export function formatReport(diffs: Difference[], commit: string, catalogVersion: string): string {
  return [
    `<!-- diff:${diffHash(diffs)} -->`,
    `A \`main\` do ATM-11 (\`${commit}\`) difere do catálogo publicado \`${catalogVersion}\`:`,
    '',
    ...diffs.map((d) => `- ${describeDifference(d)}`),
    '',
    'A `main` pode estar à frente do que foi publicado no CurseForge: confira antes de atualizar o catálogo.',
  ].join('\n');
}

/** Devolve a mensagem de falha se o último commit da branch padrão passou de 50 dias, senão `null`. */
export function checkInactivity(lastCommit: Date, now: Date): string | null {
  const days = Math.floor((now.getTime() - lastCommit.getTime()) / DAY_MS);
  if (days <= INACTIVITY_LIMIT_DAYS) return null;
  return (
    `Último commit da branch padrão há ${days} dias (limite ${INACTIVITY_LIMIT_DAYS}): o GitHub desativa o schedule ` +
    `após 60 dias sem atividade. Veja a seção "${README_SECTION}" do README para reativar.`
  );
}

/** Origem do catálogo `latest`: o `index.json` aponta a versão e a pasta. */
export function loadLatestSource(
  catalogDir: string,
  purpose = 'verificar o ATM-11'
): { id: string; source: CatalogSource } {
  const index: unknown = JSON.parse(fs.readFileSync(path.join(catalogDir, 'index.json'), 'utf8'));
  if (!isCatalogIndex(index)) throw new Error(`${catalogDir}/index.json está malformado`);
  const { latest, versions } = index as CatalogIndex;
  const entry = versions.find((v) => v.id === latest);
  if (!entry) throw new Error(`versão '${latest}' não está em ${catalogDir}/index.json`);
  const catalog = JSON.parse(fs.readFileSync(path.join(catalogDir, entry.folder, 'catalog.json'), 'utf8'));
  if (!catalog.source) {
    throw new Error(`o catálogo ${latest} está sem source: publique um catálogo com source (#98) antes de ${purpose}`);
  }
  return { id: latest, source: catalog.source as CatalogSource };
}

async function getOk(fetchFn: typeof fetch, url: string, headers: Record<string, string>): Promise<Response> {
  const res = await fetchFn(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res;
}

export async function fetchRemote(fetchFn: typeof fetch = fetch, token = process.env.GITHUB_TOKEN): Promise<RemoteState> {
  const headers: Record<string, string> = { 'User-Agent': 'gearlabs-check-atm11', Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const api = `https://api.github.com/repos/${ATM11_REPO}`;
  const raw = (commit: string, p: string) => getOk(fetchFn, `https://raw.githubusercontent.com/${ATM11_REPO}/${commit}/${p}`, headers);

  const commit = ((await (await getOk(fetchFn, `${api}/commits/main`, headers)).json()) as { sha: string }).sha;
  const tree = (await (await getOk(fetchFn, `${api}/git/trees/${commit}?recursive=1`, headers)).json()) as {
    truncated: boolean;
    tree: { path: string; type: string }[];
  };
  if (tree.truncated) throw new Error('árvore do ATM-11 truncada pela API do GitHub');
  const modlist = parseModlist(await (await raw(commit, MODLIST_PATH)).text());
  const scripts: Record<string, string> = {};
  for (const node of tree.tree) {
    if (node.type === 'blob' && SCRIPT_ROOTS.some((r) => node.path.startsWith(r)) && SCRIPT_FILE.test(node.path)) {
      scripts[node.path] = sha1Of(Buffer.from(await (await raw(commit, node.path)).arrayBuffer()));
    }
  }
  return { commit, modlist, scripts };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function setOutput(key: string, value: string) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

async function runCheck(): Promise<void> {
  const catalogDir = path.resolve(arg('--catalog-dir') ?? 'public/data/versions/atm11');
  const out = path.resolve(arg('--out') ?? 'check-remote-report.md');
  const { id, source } = loadLatestSource(catalogDir);
  const remote = await fetchRemote();
  const diffs = compareRemote(source, remote);
  if (diffs.length === 0) {
    console.log(`Sem mudanças: a main do ATM-11 (${remote.commit}) bate com o catálogo ${id}.`);
    setOutput('changed', 'false');
    return;
  }
  const report = formatReport(diffs, remote.commit, id);
  fs.writeFileSync(out, report + '\n');
  console.log(report);
  setOutput('changed', 'true');
  setOutput('hash', diffHash(diffs));
}

async function runInactivity(): Promise<void> {
  const repo = arg('--repo') ?? process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error('informe --repo ou GITHUB_REPOSITORY');
  const headers: Record<string, string> = { 'User-Agent': 'gearlabs-check-atm11', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await getOk(fetch, `https://api.github.com/repos/${repo}/commits?per_page=1`, headers);
  const [latest] = (await res.json()) as { commit: { committer: { date: string } } }[];
  const message = checkInactivity(new Date(latest.commit.committer.date), new Date(arg('--now') ?? Date.now()));
  if (message) throw new Error(message);
  console.log('Repositório ativo: o schedule não corre risco de ser desativado.');
}

if (require.main === module) {
  const command = process.argv[2];
  const run = command === 'inactivity' ? runInactivity : command === 'check' ? runCheck : undefined;
  if (!run) {
    console.error('uso: check-remote.ts <check|inactivity>');
    process.exit(2);
  }
  run().catch((err) => {
    console.error(`[check-remote] ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });
}
