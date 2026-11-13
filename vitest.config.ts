import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: [...configDefaults.exclude, '.worktrees/**', '.claude/worktrees/**'],
    // Vitest 5 enforces the timeout on tests that block on spawnSync (tsx child
    // processes take 2-6 s each with all workers busy); Vitest 2 let them pass.
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
