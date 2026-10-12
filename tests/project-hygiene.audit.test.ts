import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vitestConfig from '../vitest.config';

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

describe('Auditoria #31: licença coerente com a dependência mixbox (CC BY-NC 4.0)', () => {
  it('existe um LICENSE na raiz e o package.json declara a licença', () => {
    expect(fs.existsSync(path.join(root, 'LICENSE'))).toBe(true);
    expect(pkg.license).toBeTruthy();
  });

  it('o README não declara MIT enquanto o bundle distribui mixbox, de uso não comercial', () => {
    const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    const claimsMit = /\bMIT\b/.test(readme) || pkg.license === 'MIT';
    expect(claimsMit && 'mixbox' in pkg.dependencies).toBe(false);
  });
});

describe('Auditoria #49: fixture do dump do jogo', () => {
  it('material_export.tsv tem proveniência registrada como dump de /sgear_mats do jogo', () => {
    const metaPath = path.join(root, 'tests/fixtures/material_export.meta.json');
    expect(fs.existsSync(metaPath)).toBe(true);

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    expect(meta.source).toBe('/sgear_mats dump');
    expect(meta.silentGearVersion).toBe('4.2.3');
  });
});

describe('Infra de testes', () => {
  it('o vitest ignora os worktrees de agentes em .claude/worktrees', () => {
    expect(vitestConfig.test?.exclude).toContain('.claude/worktrees/**');
  });
});
