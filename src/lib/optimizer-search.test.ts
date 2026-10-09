import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createDebouncedTask,
  createLatestRequestTracker,
  runOptimizerSearch,
  SEARCH_DEBOUNCE_MS,
} from './optimizer-search';
import { ATM11_CATALOG } from '@/data/defaultCatalog';

describe('runOptimizerSearch', () => {
  it('devolve o resultado com o mesmo id da requisição, rodando sem DOM', () => {
    const reply = runOptimizerSearch({
      id: 7,
      catalog: ATM11_CATALOG,
      topN: 3,
      request: {
        gearTypeId: 'sword',
        availableMaterials: Object.keys(ATM11_CATALOG.materials),
        goal: 'max_damage',
      },
    });

    expect('results' in reply && reply.id).toBe(7);
    expect('results' in reply && reply.results.length).toBeGreaterThan(0);
  });

  it('transforma exceções da busca em erro serializável em vez de derrubar o worker', () => {
    const reply = runOptimizerSearch({
      id: 3,
      catalog: ATM11_CATALOG,
      topN: 3,
      request: { gearTypeId: 'tipo-inexistente', availableMaterials: [], goal: 'max_damage' },
    });

    expect(reply).toEqual({ id: 3, error: "GearType 'tipo-inexistente' not found." });
  });
});

describe('createLatestRequestTracker', () => {
  it('descarta respostas de requisições anteriores à última emitida', () => {
    const tracker = createLatestRequestTracker();
    const first = tracker.next();
    const second = tracker.next();

    expect(tracker.isLatest(first)).toBe(false);
    expect(tracker.isLatest(second)).toBe(true);
  });
});

describe('createDebouncedTask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executa uma única vez com os últimos argumentos quando as mudanças chegam em rajada', () => {
    const task = vi.fn<(n: number) => void>();
    const debounced = createDebouncedTask(task, SEARCH_DEBOUNCE_MS);

    for (let n = 1; n <= 10; n++) {
      debounced.schedule(n);
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS / 2);
    }
    expect(task).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(task).toHaveBeenCalledTimes(1);
    expect(task).toHaveBeenCalledWith(10);
  });

  it('executa cada mudança espaçada além do atraso, sem perder nenhuma', () => {
    const task = vi.fn<(n: number) => void>();
    const debounced = createDebouncedTask(task, SEARCH_DEBOUNCE_MS);

    for (let n = 1; n <= 10; n++) {
      debounced.schedule(n);
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    }
    expect(task).toHaveBeenCalledTimes(10);
  });

  it('cancelar descarta a execução pendente', () => {
    const task = vi.fn();
    const debounced = createDebouncedTask(task, SEARCH_DEBOUNCE_MS);

    debounced.schedule();
    debounced.cancel();
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2);

    expect(task).not.toHaveBeenCalled();
  });
});
