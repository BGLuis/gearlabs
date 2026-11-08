import * as fs from 'fs';
import * as path from 'path';
import { compareVersionIds } from '../src/lib/catalog-index';
import type { CatalogIndex, CatalogIndexEntry, Material, MaterialTraitRef, VersionCatalog } from '../src/types/silentgear';

export interface FieldChange {
  /** caminho com `.` até a folha (`stats.main.durability`); objetos são percorridos, arrays são folhas */
  path: string;
  before?: unknown;
  after?: unknown;
}

export interface TraitChange {
  slot: string;
  trait: string;
  kind: 'added' | 'removed' | 'changed';
  before?: MaterialTraitRef;
  after?: MaterialTraitRef;
}

export interface MaterialChange {
  id: string;
  fields: FieldChange[];
  traits: TraitChange[];
}

export interface CatalogDiff {
  added: string[];
  removed: string[];
  changed: MaterialChange[];
}

type Materials = Pick<VersionCatalog, 'materials'>;

function flatten(value: unknown, prefix: string, out: Map<string, unknown>): void {
  if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0) {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, out);
  } else {
    out.set(prefix, value);
  }
}

/** os traits têm comparação própria, por slot */
function withoutTraits(material: Material): Record<string, unknown> {
  return Object.fromEntries(Object.entries(material).filter(([key]) => key !== 'traits'));
}

function diffFields(before: Material, after: Material): FieldChange[] {
  const a = new Map<string, unknown>();
  const b = new Map<string, unknown>();
  flatten(withoutTraits(before), '', a);
  flatten(withoutTraits(after), '', b);
  const paths = [...new Set([...a.keys(), ...b.keys()])].sort();
  return paths
    .filter((p) => JSON.stringify(a.get(p)) !== JSON.stringify(b.get(p)))
    .map((p) => ({ path: p, ...(a.has(p) && { before: a.get(p) }), ...(b.has(p) && { after: b.get(p) }) }));
}

/** Um trait repetido no mesmo slot ganha `#2`, `#3`..., para nenhuma ocorrência ser engolida. */
function indexTraits(refs: MaterialTraitRef[] = []): Map<string, MaterialTraitRef> {
  const out = new Map<string, MaterialTraitRef>();
  const seen = new Map<string, number>();
  for (const ref of refs) {
    const n = (seen.get(ref.name) ?? 0) + 1;
    seen.set(ref.name, n);
    out.set(n === 1 ? ref.name : `${ref.name}#${n}`, ref);
  }
  return out;
}

function diffTraits(before: Material, after: Material): TraitChange[] {
  const changes: TraitChange[] = [];
  const slots = [...new Set([...Object.keys(before.traits ?? {}), ...Object.keys(after.traits ?? {})])].sort();
  for (const slot of slots) {
    const a = indexTraits(before.traits?.[slot as keyof Material['traits']]);
    const b = indexTraits(after.traits?.[slot as keyof Material['traits']]);
    for (const key of [...new Set([...a.keys(), ...b.keys()])].sort()) {
      const x = a.get(key);
      const y = b.get(key);
      if (x && !y) changes.push({ slot, trait: key, kind: 'removed', before: x });
      else if (!x && y) changes.push({ slot, trait: key, kind: 'added', after: y });
      else if (JSON.stringify(x) !== JSON.stringify(y)) changes.push({ slot, trait: key, kind: 'changed', before: x, after: y });
    }
  }
  return changes;
}

/** Compara os materiais de dois catálogos: adicionados, removidos e, por alterado, campos e traits por slot. */
export function diffCatalogs(previous: Materials, next: Materials): CatalogDiff {
  const prev = previous.materials;
  const nxt = next.materials;
  const changed: MaterialChange[] = [];
  for (const id of Object.keys(nxt).sort()) {
    if (!(id in prev)) continue;
    const fields = diffFields(prev[id], nxt[id]);
    const traits = diffTraits(prev[id], nxt[id]);
    if (fields.length || traits.length) changed.push({ id, fields, traits });
  }
  return {
    added: Object.keys(nxt).filter((id) => !(id in prev)).sort(),
    removed: Object.keys(prev).filter((id) => !(id in nxt)).sort(),
    changed,
  };
}

export interface ReportContext {
  previous: string;
  next: string;
  /** ids removidos que `--allow-removed` autorizou */
  allowedRemoved?: string[];
}

const fmtJson = (value: unknown) => (value === undefined ? '_(ausente)_' : `\`${JSON.stringify(value)}\``);
const fmtTrait = (ref?: MaterialTraitRef) => (ref ? `nível ${ref.level}${ref.conditions?.length ? `, condições ${JSON.stringify(ref.conditions)}` : ''}` : '');

function traitLine(c: TraitChange): string {
  const head = `trait \`${c.slot}\` \`${c.trait}\``;
  if (c.kind === 'added') return `- ${head}: adicionado (${fmtTrait(c.after)})`;
  if (c.kind === 'removed') return `- ${head}: removido (${fmtTrait(c.before)})`;
  return `- ${head}: ${fmtTrait(c.before)} → ${fmtTrait(c.after)}`;
}

export function isEmptyDiff(diff: CatalogDiff): boolean {
  return !diff.added.length && !diff.removed.length && !diff.changed.length;
}

/** Markdown para o `catalog.diff.md`: resumo no topo, um `<details>` por material alterado, nada truncado. */
export function formatDiffReport(diff: CatalogDiff, ctx: ReportContext): string {
  const lines = [`# Diferenças do catálogo: ${ctx.previous} → ${ctx.next}`, ''];
  if (isEmptyDiff(diff)) return [...lines, 'Sem mudanças.', ''].join('\n');
  const allowed = new Set(ctx.allowedRemoved ?? []);
  lines.push(
    '## Resumo',
    '',
    `- Adicionados: ${diff.added.length}`,
    `- Removidos: ${diff.removed.length}`,
    `- Alterados: ${diff.changed.length}`,
    ''
  );
  if (diff.added.length) lines.push('### Adicionados', '', ...diff.added.map((id) => `- \`${id}\``), '');
  if (diff.removed.length) {
    lines.push('### Removidos', '', ...diff.removed.map((id) => `- \`${id}\`${allowed.has(id) ? ' (autorizado)' : ''}`), '');
  }
  if (diff.changed.length) {
    lines.push('### Alterados', '', '| Material | Campos | Traits |', '| --- | ---: | ---: |');
    lines.push(...diff.changed.map((c) => `| \`${c.id}\` | ${c.fields.length} | ${c.traits.length} |`), '');
    lines.push('## Detalhes', '');
    for (const c of diff.changed) {
      lines.push(`<details><summary><code>${c.id}</code></summary>`, '');
      lines.push(...c.traits.map(traitLine));
      lines.push(...c.fields.map((f) => `- \`${f.path}\`: ${fmtJson(f.before)} → ${fmtJson(f.after)}`));
      lines.push('', '</details>', '');
    }
  }
  return lines.join('\n');
}

/** `a,b` → `['a', 'b']`; vazio ou ausente → `[]`. */
export function parseAllowRemoved(raw: string | undefined): string[] {
  return (raw ?? '').split(',').map((id) => id.trim()).filter(Boolean);
}

/** A maior versão do índice estritamente menor que `id`. */
export function findPreviousVersion(index: CatalogIndex | null, id: string): CatalogIndexEntry | undefined {
  return index?.versions
    .filter((v) => compareVersionIds(v.id, id) < 0)
    .sort((a, b) => compareVersionIds(b.id, a.id))[0];
}

export class RemovalBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RemovalBlockedError';
  }
}

/** Por que a guarda barra: removidos fora de `allowRemoved` e ids autorizados que não foram removidos. */
export function removalProblems(removed: string[], allowRemoved: string[]): string[] {
  const blocked = removed.filter((id) => !allowRemoved.includes(id));
  const unknown = allowRemoved.filter((id) => !removed.includes(id));
  return [
    ...(blocked.length ? [`materiais removidos sem autorização (use --allow-removed): ${blocked.join(', ')}`] : []),
    ...(unknown.length ? [`--allow-removed cita ids que não foram removidos: ${unknown.join(', ')}`] : []),
  ];
}

export interface CatalogComparison {
  previous: string;
  report: string;
  diff: CatalogDiff;
}

/**
 * Compara o catálogo novo com a versão publicada imediatamente anterior e aplica a guarda: um
 * removido fora de `allowRemoved`, ou um id autorizado que não foi removido, lança
 * `RemovalBlockedError` com o relatório completo. Sem versão anterior devolve `null`.
 */
export function compareWithPrevious(
  catalogDir: string,
  index: CatalogIndex | null,
  nextId: string,
  next: Materials,
  allowRemoved: string[]
): CatalogComparison | null {
  const entry = findPreviousVersion(index, nextId);
  if (!entry) {
    const reasons = removalProblems([], allowRemoved);
    if (reasons.length) throw new RemovalBlockedError(`${reasons.join('\n')}\nNão há versão anterior a ${nextId}.`);
    return null;
  }
  const file = path.join(catalogDir, entry.folder, 'catalog.json');
  const previous = JSON.parse(fs.readFileSync(file, 'utf-8')) as VersionCatalog;
  if (!previous.materials || typeof previous.materials !== 'object') {
    throw new Error(`${file} está malformado: sem materials para comparar`);
  }
  const diff = diffCatalogs(previous, next);
  const report = formatDiffReport(diff, { previous: entry.id, next: nextId, allowedRemoved: allowRemoved });
  const reasons = removalProblems(diff.removed, allowRemoved);
  if (reasons.length) throw new RemovalBlockedError(`${reasons.join('\n')}\nNada foi gravado.\n\n${report}`);
  return { previous: entry.id, report, diff };
}
