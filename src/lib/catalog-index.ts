import type { CatalogIndex, CatalogIndexEntry } from '@/types/silentgear';

/** Preset cujos catálogos são versionados por release do pack. */
export const VERSIONED_PRESET = 'atm11';

/** Única versão que existia quando os links `v: "atm11"` (sem versão) foram criados. */
export const LEGACY_ATM11_VERSION = '0.11.1-beta';

const VERSION_ID = /^[0-9A-Za-z][0-9A-Za-z._-]*$/;

/** Ids viram nome de pasta e parte de URL: nada que escape de `atm11/`. */
export function isValidVersionId(id: string): boolean {
  return VERSION_ID.test(id) && !id.includes('..');
}

function splitVersionId(id: string): { core: number[]; suffix: string } {
  const dash = id.indexOf('-');
  const core = dash === -1 ? id : id.slice(0, dash);
  return { core: core.split('.').map((n) => parseInt(n, 10) || 0), suffix: dash === -1 ? '' : id.slice(dash + 1) };
}

/**
 * Compara major.minor.patch numericamente. Com o mesmo número, a release vence a pré-release
 * (`0.12.0` > `0.12.0-beta`); entre sufixos diferentes vale a ordem natural do texto.
 */
export function compareVersionIds(a: string, b: string): number {
  const pa = splitVersionId(a);
  const pb = splitVersionId(b);
  for (let i = 0; i < Math.max(pa.core.length, pb.core.length); i++) {
    const diff = (pa.core[i] ?? 0) - (pb.core[i] ?? 0);
    if (diff !== 0) return diff;
  }
  if (pa.suffix === pb.suffix) return 0;
  if (pa.suffix === '') return 1;
  if (pb.suffix === '') return -1;
  return pa.suffix.localeCompare(pb.suffix, 'en', { numeric: true });
}

export function indexUrl(preset: string = VERSIONED_PRESET): string {
  return `/data/versions/${preset}/index.json`;
}

export function versionCatalogUrl(entry: Pick<CatalogIndexEntry, 'folder'>, preset: string = VERSIONED_PRESET): string {
  return `/data/versions/${preset}/${entry.folder}/catalog.json`;
}

/** Separa a chave de versão do link: `atm11@0.14.0-beta` → preset + versão do pack. */
export function parseVersionKey(key: string): { preset: string; pack?: string } {
  const prefix = `${VERSIONED_PRESET}@`;
  if (!key.startsWith(prefix)) return { preset: key };
  return { preset: VERSIONED_PRESET, pack: key.slice(prefix.length) };
}

export function formatVersionKey(preset: string, pack: string): string {
  return `${preset}@${pack}`;
}

export function isCatalogIndex(value: unknown): value is CatalogIndex {
  const v = value as CatalogIndex | null;
  return (
    !!v &&
    typeof v.latest === 'string' &&
    Array.isArray(v.versions) &&
    v.versions.every((e) => !!e && typeof e.id === 'string' && typeof e.folder === 'string') &&
    v.versions.some((e) => e.id === v.latest)
  );
}

/**
 * Acrescenta uma versão ao índice sem alterar o original. A lista fica da mais nova para a mais
 * velha; `latest` só muda quando a nova é mais nova que a atual.
 */
export function appendIndexEntry(index: CatalogIndex | null, entry: CatalogIndexEntry): CatalogIndex {
  if (!index) return { latest: entry.id, versions: [entry] };
  if (index.versions.some((v) => v.id === entry.id)) {
    throw new Error(`versão '${entry.id}' já está no índice`);
  }
  const versions = [...index.versions, entry].sort((a, b) => compareVersionIds(b.id, a.id));
  const latest = compareVersionIds(entry.id, index.latest) > 0 ? entry.id : index.latest;
  return { latest, versions };
}
