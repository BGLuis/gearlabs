import { describe, it, expect } from 'vitest';
import atm11Json from '../../public/data/versions/atm11/catalog.json';
import { VersionCatalog } from '@/types/silentgear';

/**
 * Auditoria #45: a lógica de carga do catálogo vive hoje dentro de GearProvider (efeitos do React),
 * sem como testá-la. Estes testes exigem que ela seja extraída para `@/lib/catalog-loader`.
 */
const LOADER_MODULE = '@/lib/catalog-loader';
const loadModule = () => import(/* @vite-ignore */ LOADER_MODULE);

const atm11 = atm11Json as unknown as VersionCatalog;
const json = (body: unknown, ok = true) => async () => ({ ok, json: async () => body }) as Response;

describe('Auditoria #45: inventário inicial', () => {
  it('getDefaultInventory devolve todos os materiais do catálogo carregado, não só os 16 embutidos', async () => {
    const { getDefaultInventory } = await loadModule();
    const inventory: Set<string> = getDefaultInventory(atm11);

    expect(inventory.size).toBe(Object.keys(atm11.materials).length);
    expect(inventory.has('sgearmetalworks:uru_metal')).toBe(true);
    expect(inventory.has('silentgear:tyrian_steel')).toBe(true);
  });
});

describe('Auditoria #45: falha ao carregar o catalog.json não pode ser silenciosa', () => {
  it('resposta 404 devolve um erro visível para a interface', async () => {
    const { loadVersionCatalog } = await loadModule();
    const result = await loadVersionCatalog('atm11', json({}, false));
    expect(result.error).toBeTruthy();
  });

  it('falha de rede devolve um erro visível para a interface', async () => {
    const { loadVersionCatalog } = await loadModule();
    const result = await loadVersionCatalog('atm11', async () => {
      throw new Error('offline');
    });
    expect(result.error).toBeTruthy();
  });

  it('versão desconhecida (link antigo atm9) não vira o catálogo atm11 sem aviso', async () => {
    const { loadVersionCatalog } = await loadModule();
    const result = await loadVersionCatalog('atm9', json({}, false));
    expect(result.error).toBeTruthy();
  });

  it('carga bem-sucedida não tem erro e devolve o catálogo recebido', async () => {
    const { loadVersionCatalog } = await loadModule();
    const result = await loadVersionCatalog('atm11', json(atm11));
    expect(result.error).toBeFalsy();
    expect(Object.keys(result.catalog.materials)).toHaveLength(Object.keys(atm11.materials).length);
  });
});
