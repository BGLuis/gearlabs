import { OptimizationRequest, OptimizedBuildResult, VersionCatalog } from '@/types/silentgear';
import { findBestBuilds } from './optimizer';

export const SEARCH_DEBOUNCE_MS = 200;

export interface OptimizerSearchMessage {
  id: number;
  request: OptimizationRequest;
  catalog: VersionCatalog;
  topN: number;
}

export type OptimizerSearchReply =
  | { id: number; results: OptimizedBuildResult[] }
  | { id: number; error: string };

export function runOptimizerSearch({ id, request, catalog, topN }: OptimizerSearchMessage): OptimizerSearchReply {
  try {
    return { id, results: findBestBuilds(request, catalog, topN) };
  } catch (e) {
    return { id, error: e instanceof Error ? e.message : String(e) };
  }
}

export function createLatestRequestTracker() {
  let latest = 0;
  return {
    next: () => ++latest,
    isLatest: (id: number) => id === latest,
  };
}

export function createDebouncedTask<A extends unknown[]>(task: (...args: A) => void, delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    schedule(...args: A) {
      clearTimeout(timer);
      timer = setTimeout(() => task(...args), delayMs);
    },
    cancel() {
      clearTimeout(timer);
    },
  };
}
