import { OptimizerSearchMessage, runOptimizerSearch } from '@/lib/optimizer-search';

addEventListener('message', (event: MessageEvent<OptimizerSearchMessage>) => {
  postMessage(runOptimizerSearch(event.data));
});
