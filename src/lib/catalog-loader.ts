import { CatalogIndex, VersionCatalog } from '@/types/silentgear';
import {
  VERSIONED_PRESET,
  indexUrl,
  isValidVersionId,
  parseVersionKey,
  resolveVersionEntry,
  versionCatalogUrl,
} from './catalog-index';
import { ATM11_CATALOG } from '@/data/defaultCatalog';

export function getDefaultInventory(catalog: VersionCatalog): Set<string> {
  return new Set(Object.keys(catalog.materials));
}

/** Versão do pack resolvida pelo índice: a ativa, a mais recente e o índice inteiro (para o seletor). */
export interface ResolvedPackVersion {
  id: string;
  latest: string;
  index: CatalogIndex;
}

export interface LoadedCatalog {
  catalog: VersionCatalog;
  error: string | null;
  /** só para o preset versionado, e `null` quando o índice não carregou */
  resolved?: ResolvedPackVersion | null;
}

async function fetchJson<T>(fetchFn: typeof fetch, url: string): Promise<{ data: T } | { status: number }> {
  const res = await fetchFn(url);
  if (!res.ok) return { status: res.status };
  return { data: (await res.json()) as T };
}

function failure(error: string, resolved?: ResolvedPackVersion | null): LoadedCatalog {
  return { catalog: ATM11_CATALOG, error, ...(resolved !== undefined && { resolved }) };
}

async function loadPackCatalog(pack: string | undefined, fetchFn: typeof fetch): Promise<LoadedCatalog> {
  if (pack !== undefined && !isValidVersionId(pack)) {
    return failure(`versão inválida '${pack}' para o ${VERSIONED_PRESET}`, null);
  }
  const indexRes = await fetchJson<CatalogIndex>(fetchFn, indexUrl());
  if (!('data' in indexRes)) {
    return failure(`index.json do ${VERSIONED_PRESET} não encontrado (HTTP ${indexRes.status})`, null);
  }
  const index = indexRes.data;
  const id = pack ?? index.latest;
  const resolved: ResolvedPackVersion = { id, latest: index.latest, index };
  let entry;
  try {
    entry = resolveVersionEntry(index, pack);
  } catch (err) {
    return failure(err instanceof Error ? err.message : String(err), resolved);
  }
  const res = await fetchJson<VersionCatalog>(fetchFn, versionCatalogUrl(entry));
  if (!('data' in res)) {
    return failure(`catalog.json de '${VERSIONED_PRESET}@${id}' não encontrado (HTTP ${res.status})`, resolved);
  }
  return { catalog: res.data, error: null, resolved };
}

/**
 * Carrega o catalog.json da versão. Em qualquer falha devolve o catálogo embutido
 * (só para a interface continuar utilizável) junto com o erro, que a interface deve exibir.
 * `atm11` resolve `latest` pelo índice; `atm11@<versão>` carrega aquela pasta.
 */
export async function loadVersionCatalog(
  version: string,
  fetchFn: typeof fetch = fetch
): Promise<LoadedCatalog> {
  try {
    const { preset, pack } = parseVersionKey(version);
    if (preset === VERSIONED_PRESET) return await loadPackCatalog(pack, fetchFn);

    const res = await fetchFn(`/data/versions/${version}/catalog.json`);
    if (res.ok) {
      return { catalog: (await res.json()) as VersionCatalog, error: null, resolved: null };
    }
    return failure(`catalog.json de '${version}' não encontrado (HTTP ${res.status})`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return failure(`falha ao carregar o catalog.json de '${version}': ${reason}`);
  }
}
