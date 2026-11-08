import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
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
  it.each([
    ['atm11-0.9.0-beta', '0.9.0-beta'],
    ['atm11-0.14.0-beta', '0.14.0-beta'],
  ])('material_export.%s tem proveniência registrada como dump de /sgear_mats do jogo', (suffix, packVersion) => {
    const base = path.join(root, `tests/fixtures/material_export.${suffix}`);
    expect(fs.existsSync(`${base}.tsv`)).toBe(true);
    expect(fs.existsSync(`${base}.meta.json`)).toBe(true);

    const meta = JSON.parse(fs.readFileSync(`${base}.meta.json`, 'utf8'));
    expect(meta.source).toBe('/sgear_mats dump');
    expect(meta.silentGearVersion).toBe('4.2.3');
    expect(meta.packVersion).toContain(packVersion);
    const sha256 = createHash('sha256').update(fs.readFileSync(`${base}.tsv`)).digest('hex');
    expect(meta.sha256).toBe(sha256);
  });

  it('os dois dumps do jogo têm o mesmo cabeçalho de colunas', () => {
    const header = (suffix: string) =>
      fs.readFileSync(path.join(root, `tests/fixtures/material_export.${suffix}.tsv`), 'utf8').split('\n', 1)[0];
    expect(header('atm11-0.14.0-beta')).toBe(header('atm11-0.9.0-beta'));
  });
});

describe('Auditoria #106: dumps das rodadas do spike de ordem de camadas', () => {
  const runs = [1, 2, 3, 4, 5, 6];
  const probeBase = (n: number) => path.join(root, `tests/fixtures/material_export.probe-106-run${n}`);

  it.each(runs)('probe-106-run%i tem meta com proveniência, config da rodada e sha256 do TSV', (n) => {
    const base = probeBase(n);
    expect(fs.existsSync(`${base}.tsv`)).toBe(true);
    const meta = JSON.parse(fs.readFileSync(`${base}.meta.json`, 'utf8'));
    expect(meta.source).toBe('/sgear_mats dump');
    expect(meta.silentGearVersion).toBe('4.2.3');
    expect(meta.run).toBe(n);
    expect(meta.modLoader).toBeTruthy();
    expect(Array.isArray(meta.probes)).toBe(true);
    const sha256 = createHash('sha256').update(fs.readFileSync(`${base}.tsv`)).digest('hex');
    expect(meta.sha256).toBe(sha256);
  });

  it('os dumps das rodadas têm o mesmo cabeçalho do dump do ATM11', () => {
    const header = (file: string) => fs.readFileSync(file, 'utf8').split('\n', 1)[0];
    const expected = header(path.join(root, 'tests/fixtures/material_export.atm11-0.14.0-beta.tsv'));
    for (const n of runs) expect(header(`${probeBase(n)}.tsv`)).toBe(expected);
  });

  it('a rodada 5 registra também a linha de silentgear:iron', () => {
    const rows = fs.readFileSync(`${probeBase(5)}.tsv`, 'utf8').split('\n').filter((l) => l.split('\t')[3] === 'silentgear:iron');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('cada dump registra a linha de silentgear:order_probe', () => {
    for (const n of runs) {
      const rows = fs
        .readFileSync(`${probeBase(n)}.tsv`, 'utf8')
        .split('\n')
        .filter((l) => l.split('\t')[3] === 'silentgear:order_probe');
      expect(rows.length).toBeGreaterThan(0);
    }
  });
});

describe('Infra de testes', () => {
  it('o vitest ignora os worktrees de agentes em .claude/worktrees', () => {
    expect(vitestConfig.test?.exclude).toContain('.claude/worktrees/**');
  });
});
