import { describe, it, expect } from 'vitest';
import type { CatalogIndex } from '@/types/silentgear';
import { loadVersionCatalog } from './catalog-loader';
import { ATM11_CATALOG } from '@/data/defaultCatalog';

const entry = (id: string) => ({ id, folder: id, minecraft: '26.1.2', sha1: 'a'.repeat(40) });
const INDEX: CatalogIndex = {
  latest: '0.14.0-beta',
  versions: [entry('0.14.0-beta'), entry('0.11.1-beta')],
};

function fakeFetch(routes: Record<string, unknown>) {
  const urls: string[] = [];
  const fn = (async (url: string) => {
    urls.push(url);
    if (url in routes) return { ok: true, status: 200, json: async () => routes[url] } as Response;
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  }) as unknown as typeof fetch;
  return { fn, urls };
}

const cat = (tag: string) => ({ version: tag, materials: {}, gearTypes: {}, traits: {} });

describe('loadVersionCatalog: versões do atm11 (#96)', () => {
  const routes = {
    '/data/versions/atm11/index.json': INDEX,
    '/data/versions/atm11/0.14.0-beta/catalog.json': cat('new'),
    '/data/versions/atm11/0.11.1-beta/catalog.json': cat('old'),
  };

  it("'atm11' carrega a pasta de latest do index.json", async () => {
    const { fn, urls } = fakeFetch(routes);
    const result = await loadVersionCatalog('atm11', fn);
    expect(result.error).toBeNull();
    expect(result.catalog.version).toBe('new');
    expect(result.resolved).toEqual({ id: '0.14.0-beta', latest: '0.14.0-beta', index: INDEX });
    expect(urls).toEqual(['/data/versions/atm11/index.json', '/data/versions/atm11/0.14.0-beta/catalog.json']);
  });

  it("'atm11@0.11.1-beta' carrega aquela pasta e informa que latest é outra", async () => {
    const { fn, urls } = fakeFetch(routes);
    const result = await loadVersionCatalog('atm11@0.11.1-beta', fn);
    expect(result.catalog.version).toBe('old');
    expect(result.resolved?.id).toBe('0.11.1-beta');
    expect(result.resolved?.latest).toBe('0.14.0-beta');
    expect(urls[urls.length - 1]).toBe('/data/versions/atm11/0.11.1-beta/catalog.json');
  });

  it('link criado na 0.14.0-beta continua abrindo a 0.14.0-beta depois que outra versão vira latest', async () => {
    const later: CatalogIndex = { latest: '0.15.0-beta', versions: [entry('0.15.0-beta'), ...INDEX.versions] };
    const { fn, urls } = fakeFetch({ ...routes, '/data/versions/atm11/index.json': later });
    const result = await loadVersionCatalog('atm11@0.14.0-beta', fn);
    expect(result.error).toBeNull();
    expect(urls[urls.length - 1]).toBe('/data/versions/atm11/0.14.0-beta/catalog.json');
    expect(result.resolved?.latest).toBe('0.15.0-beta');
  });

  it('versão fora do índice: erro visível, catálogo embutido, sem cair em latest', async () => {
    const { fn, urls } = fakeFetch(routes);
    const result = await loadVersionCatalog('atm11@9.9.9', fn);
    expect(result.error).toContain('9.9.9');
    expect(result.catalog).toBe(ATM11_CATALOG);
    expect(urls.some((u) => u.includes('0.14.0-beta/catalog.json'))).toBe(false);
    expect(result.resolved?.index).toEqual(INDEX);
    expect(result.resolved?.id).toBe('9.9.9');
  });

  it('index.json ausente: erro visível e catálogo embutido', async () => {
    const { fn } = fakeFetch({});
    const result = await loadVersionCatalog('atm11', fn);
    expect(result.error).toContain('index.json');
    expect(result.catalog).toBe(ATM11_CATALOG);
    expect(result.resolved).toBeNull();
  });

  it('id de versão com caminho escapando da pasta é recusado sem buscar nada', async () => {
    const { fn, urls } = fakeFetch(routes);
    const result = await loadVersionCatalog('atm11@../../1.21.1', fn);
    expect(result.error).toBeTruthy();
    expect(urls.some((u) => u.includes('..'))).toBe(false);
  });

  it('falha de rede no catalog.json depois do índice carregado mantém o índice para o seletor', async () => {
    const fn = (async (url: string) => {
      if (url.endsWith('/index.json')) return { ok: true, status: 200, json: async () => INDEX } as Response;
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const result = await loadVersionCatalog('atm11@0.11.1-beta', fn);
    expect(result.error).toContain('offline');
    expect(result.resolved?.index).toEqual(INDEX);
  });

  it('pasta da versão com 404: erro visível', async () => {
    const { fn } = fakeFetch({ '/data/versions/atm11/index.json': INDEX });
    const result = await loadVersionCatalog('atm11', fn);
    expect(result.error).toContain('0.14.0-beta');
    expect(result.catalog).toBe(ATM11_CATALOG);
  });

  it('presets 1.21.1 e 1.20.1 continuam em /data/versions/<preset>/catalog.json, sem índice', async () => {
    const { fn, urls } = fakeFetch({ '/data/versions/1.21.1/catalog.json': cat('off') });
    const result = await loadVersionCatalog('1.21.1', fn);
    expect(result.catalog.version).toBe('off');
    expect(result.resolved).toBeNull();
    expect(urls).toEqual(['/data/versions/1.21.1/catalog.json']);
  });
});
