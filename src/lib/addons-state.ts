import { VERSIONED_PRESET, compareVersionIds, formatVersionKey } from '@/lib/catalog-index';

/** O pedaço do `localStorage` que esta lógica usa; permite testar em `node` sem DOM. */
export type AddonsStorage = Pick<Storage, 'getItem' | 'setItem'>;

const KEY_PREFIX = 'gearlabs_addons_';

/**
 * Chave dos addons ativos. O preset versionado (`atm11`) guarda um estado por versão do pack;
 * a chave `gearlabs_addons_atm11`, sem versão, é a legada e só é lida. Os demais presets
 * seguem com `gearlabs_addons_<preset>`.
 */
export function addonsStorageKey(preset: string, pack?: string): string {
  if (preset === VERSIONED_PRESET && pack) return `${KEY_PREFIX}${formatVersionKey(preset, pack)}`;
  return `${KEY_PREFIX}${preset}`;
}

/**
 * Valida o valor guardado: devolve os ids se for uma lista de textos (`[]` vale: o jogador
 * desligou tudo) e `null` se faltar, estiver quebrado ou tiver outro formato.
 */
export function parseStoredAddons(raw: string | null): string[] | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) return parsed;
  } catch {
    // valor quebrado conta como ausente
  }
  return null;
}

/** Qual estado guardado está em jogo: o preset e, no preset versionado, a versão do pack. */
export interface AddonsStateTarget {
  preset: string;
  /** versão do pack carregada; `undefined` nos presets sem índice e quando o índice não carregou */
  pack?: string;
  /** o catálogo carregado é o de fallback: ler, mas não migrar nem gravar */
  catalogFailed: boolean;
}

export interface LoadAddonsOptions extends AddonsStateTarget {
  /** ids de addon do catálogo carregado */
  catalogAddonIds: string[];
  /** addons ligados por padrão no catálogo carregado */
  defaults: string[];
  /** versões do índice; a ordem não importa, a mais recente é achada por `compareVersionIds` */
  knownVersions: string[];
}

/**
 * Addons ativos ao carregar uma versão. Estado próprio da versão vale como está. Sem ele, a
 * versão copia a maior versão do índice com estado salvo, depois a chave legada, filtrando os
 * ids que o catálogo não tem, e grava na chave nova. Sem nenhuma origem, usa os defaults sem gravar.
 * Com o catálogo de fallback devolve a origem sem filtrar e sem gravar: filtrar por um catálogo
 * que não é o da versão e gravar congelaria um estado errado.
 */
export function loadActiveAddons(storage: AddonsStorage, opts: LoadAddonsOptions): string[] {
  const { preset, pack, catalogAddonIds, defaults, knownVersions, catalogFailed } = opts;
  const own = parseStoredAddons(storage.getItem(addonsStorageKey(preset, pack)));
  if (own) return own;
  // sem versão do pack, a chave "própria" acima já é a legada
  if (preset !== VERSIONED_PRESET || !pack) return defaults;

  let source: string[] | null = null;
  const others = knownVersions.filter((v) => v !== pack).sort((a, b) => compareVersionIds(b, a));
  for (const other of others) {
    source = parseStoredAddons(storage.getItem(addonsStorageKey(preset, other)));
    if (source) break;
  }
  source ??= parseStoredAddons(storage.getItem(addonsStorageKey(preset)));
  if (!source) return defaults;
  if (catalogFailed) return source;

  const known = new Set(catalogAddonIds);
  const copied = source.filter((id) => known.has(id));
  saveActiveAddons(storage, { preset, pack, catalogFailed }, copied);
  return copied;
}

/**
 * Grava os addons ativos na chave da versão editada. Não grava com o catálogo de fallback nem
 * no preset versionado sem versão (a chave legada nunca é escrita).
 */
export function saveActiveAddons(storage: AddonsStorage, target: AddonsStateTarget, ids: string[]): void {
  if (target.catalogFailed || (target.preset === VERSIONED_PRESET && !target.pack)) return;
  storage.setItem(addonsStorageKey(target.preset, target.pack), JSON.stringify(ids));
}
