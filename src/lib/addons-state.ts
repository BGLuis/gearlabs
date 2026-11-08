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

export interface LoadAddonsOptions {
  preset: string;
  /** versão do pack carregada; `undefined` nos presets sem índice e quando o índice não carregou */
  pack?: string;
  /** ids de addon do catálogo carregado */
  catalogAddonIds: string[];
  /** addons ligados por padrão no catálogo carregado */
  defaults: string[];
  /** versões do índice, em qualquer ordem */
  knownVersions: string[];
  /** o catálogo carregado é o de fallback: ler, mas não migrar nem gravar */
  catalogFailed: boolean;
}

/**
 * Addons ativos ao carregar uma versão. Estado próprio da versão vale como está. Sem ele, a
 * versão copia a maior versão do índice com estado salvo, depois a chave legada, filtrando os
 * ids que o catálogo não tem, e grava na chave nova. Sem nenhuma origem, usa os defaults sem gravar.
 */
export function loadActiveAddons(storage: AddonsStorage, opts: LoadAddonsOptions): string[] {
  const { preset, pack, catalogAddonIds, defaults, knownVersions, catalogFailed } = opts;
  const own = parseStoredAddons(storage.getItem(addonsStorageKey(preset, pack)));
  if (own) return own;

  const versioned = preset === VERSIONED_PRESET;
  if (!versioned) return defaults;
  // sem versão do pack, a chave "própria" acima já é a legada
  if (!pack) return defaults;

  let source: string[] | null = null;
  const others = knownVersions.filter((v) => v !== pack).sort((a, b) => compareVersionIds(b, a));
  for (const other of others) {
    source = parseStoredAddons(storage.getItem(addonsStorageKey(preset, other)));
    if (source) break;
  }
  source ??= parseStoredAddons(storage.getItem(addonsStorageKey(preset)));
  if (!source) return defaults;

  const known = new Set(catalogAddonIds);
  const copied = source.filter((id) => known.has(id));
  if (!catalogFailed) saveActiveAddons(storage, preset, pack, copied);
  return catalogFailed ? source : copied;
}

/** Grava os addons ativos na chave da versão editada; no preset versionado sem versão não grava. */
export function saveActiveAddons(storage: AddonsStorage, preset: string, pack: string | undefined, ids: string[]): void {
  if (preset === VERSIONED_PRESET && !pack) return;
  storage.setItem(addonsStorageKey(preset, pack), JSON.stringify(ids));
}
