import { VersionCatalog } from '@/types/silentgear';
import { ATM11_CATALOG } from '@/data/defaultCatalog';

export interface LoadedCatalog {
  catalog: VersionCatalog;
  error: string | null;
}

export function getDefaultInventory(catalog: VersionCatalog): Set<string> {
  return new Set(Object.keys(catalog.materials));
}

/**
 * Carrega o catalog.json da versão. Em qualquer falha devolve o catálogo embutido
 * (só para a interface continuar utilizável) junto com o erro, que a interface deve exibir.
 */
export async function loadVersionCatalog(
  version: string,
  fetchFn: typeof fetch = fetch
): Promise<LoadedCatalog> {
  try {
    const res = await fetchFn(`/data/versions/${version}/catalog.json`);
    if (res.ok) {
      return { catalog: (await res.json()) as VersionCatalog, error: null };
    }
    return { catalog: ATM11_CATALOG, error: `catalog.json de '${version}' não encontrado (HTTP ${res.status})` };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { catalog: ATM11_CATALOG, error: `falha ao carregar o catalog.json de '${version}': ${reason}` };
  }
}
