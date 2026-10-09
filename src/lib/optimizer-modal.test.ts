import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const modalSource = readFileSync(
  fileURLToPath(new URL('../components/OptimizerModal.tsx', import.meta.url)),
  'utf8'
);

describe('OptimizerModal', () => {
  it('memoiza a lista de materiais disponíveis para que findBestBuilds não rode a cada render', () => {
    const lines = modalSource.split('\n');
    const copies = lines.filter((line) => line.includes('Array.from(inventory)'));

    expect(copies.length).toBeGreaterThan(0);
    for (const line of copies) {
      expect(line).toContain('useMemo(');
    }
  });
});
