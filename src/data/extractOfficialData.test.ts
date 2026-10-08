import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ATM11_CATALOG } from './defaultCatalog';
import { VersionCatalog } from '@/types/silentgear';

describe('Sincronização do Catálogo ATM11 com Datagen Oficial e Modpack (Issue #6)', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const catalogPath = path.join(projectRoot, 'public/data/versions/atm11/catalog.json');
  const tsvPath = path.join(projectRoot, 'output/silentgear/material_export.tsv');

  const rawCatalog = fs.readFileSync(catalogPath, 'utf-8');
  const catalog: VersionCatalog = JSON.parse(rawCatalog);

  it('Critério 1: silentgear:allthemodium tem armor 60, helmet 15, toughness 60, magic_armor 200 e armor_durability 60', () => {
    const mat = catalog.materials['silentgear:allthemodium'];
    expect(mat, 'silentgear:allthemodium deve existir no catálogo ATM11').toBeDefined();

    expect(mat.stats.main?.armor).toBe(60);
    expect(mat.stats.main?.armor_by_piece?.helmet).toBe(15);
    expect(mat.stats.main?.armor_by_piece?.chestplate).toBe(15);
    expect(mat.stats.main?.armor_by_piece?.leggings).toBe(15);
    expect(mat.stats.main?.armor_by_piece?.boots).toBe(15);
    expect(mat.stats.main?.armor_toughness).toBe(60);
    expect(mat.stats.main?.magic_armor).toBe(200);
    expect(mat.stats.main?.armor_durability).toBe(60);

    // Também no catálogo padrão em TypeScript
    const defaultMat = ATM11_CATALOG.materials['silentgear:allthemodium'];
    expect(defaultMat).toBeDefined();
    expect(defaultMat.stats.main?.armor).toBe(60);
    expect(defaultMat.stats.main?.armor_by_piece?.helmet).toBe(15);
    expect(defaultMat.stats.main?.armor_toughness).toBe(60);
    expect(defaultMat.stats.main?.magic_armor).toBe(200);
    expect(defaultMat.stats.main?.armor_durability).toBe(60);
  });

  it('Critério 2: uru_metal e tyrian_steel existem no catálogo ATM11, com tyrian_steel contendo metal, endgame e casting', () => {
    const uru = catalog.materials['sgearmetalworks:uru_metal'];
    expect(uru, 'sgearmetalworks:uru_metal deve existir no catálogo ATM11').toBeDefined();
    expect(uru.categories).toEqual(expect.arrayContaining(['metal', 'endgame', 'casting']));

    const tyrian = catalog.materials['silentgear:tyrian_steel'];
    expect(tyrian, 'silentgear:tyrian_steel deve existir no catálogo ATM11').toBeDefined();
    expect(tyrian.categories).toEqual(['metal', 'endgame', 'casting']);

    // No ATM11_CATALOG em memória também
    expect(ATM11_CATALOG.materials['sgearmetalworks:uru_metal']).toBeDefined();
    expect(ATM11_CATALOG.materials['silentgear:tyrian_steel']?.categories).toEqual([
      'metal',
      'endgame',
      'casting',
    ]);
  });

  it('Critério 3: para cada material Main do dump material_export.tsv, stats de armadura batem com o dump', () => {
    expect(fs.existsSync(tsvPath), 'output/silentgear/material_export.tsv deve existir').toBe(true);
    const content = fs.readFileSync(tsvPath, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines.length).toBeGreaterThan(1);
    const headers = lines[0].split('\t');
    const idIdx = headers.indexOf('ID');
    const typeIdx = headers.indexOf('Type');
    const durIdx = headers.indexOf('Durability');
    const armorDurIdx = headers.indexOf('Armor Durability');
    const armorIdx = headers.indexOf('Armor');
    const toughnessIdx = headers.indexOf('Armor Toughness');
    const magicArmorIdx = headers.indexOf('Magic Armor');

    expect(idIdx).toBeGreaterThanOrEqual(0);
    expect(typeIdx).toBeGreaterThanOrEqual(0);

    let mainCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      const type = parts[typeIdx];
      if (type !== 'Main') continue;

      mainCount++;
      const id = parts[idIdx];
      const dumpDur = Number(parts[durIdx]);
      const dumpArmorDur = Number(parts[armorDurIdx]);
      const dumpArmor = Number(parts[armorIdx]);
      const dumpToughness = Number(parts[toughnessIdx]);
      const dumpMagicArmor = Number(parts[magicArmorIdx]);

      const material = catalog.materials[id];
      expect(material, `Material ${id} deve existir no catálogo gerado`).toBeDefined();
      expect(material.stats.main, `Material ${id} deve conter stats.main`).toBeDefined();

      const matMain = material.stats.main!;
      const matDur = typeof matMain.durability === 'number' ? matMain.durability : 0;
      const matArmorDur = typeof matMain.armor_durability === 'number' ? matMain.armor_durability : 0;
      const matArmor = typeof matMain.armor === 'number' ? matMain.armor : 0;
      const matToughness = typeof matMain.armor_toughness === 'number' ? matMain.armor_toughness : 0;
      const matMagicArmor = typeof matMain.magic_armor === 'number' ? matMain.magic_armor : 0;

      expect(matDur, `Durabilidade divergente para ${id}`).toBe(dumpDur);
      expect(matArmorDur, `Armor Durability divergente para ${id}`).toBe(dumpArmorDur);
      expect(matArmor, `Armor divergente para ${id}`).toBe(dumpArmor);
      expect(matToughness, `Armor Toughness divergente para ${id}`).toBe(dumpToughness);
      expect(matMagicArmor, `Magic Armor divergente para ${id}`).toBe(dumpMagicArmor);
    }

    expect(mainCount).toBeGreaterThan(90);
  });

  it('Critério 4: ausência total do trait inventado proibido em src/ e public/', () => {
    const forbidden = ['allthemodium', 'godlike'].join(':');

    function scanDir(dir: string): string[] {
      const results: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...scanDir(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.json'))) {
          if (fullPath === __filename) continue;
          const fileContent = fs.readFileSync(fullPath, 'utf-8');
          if (fileContent.includes(forbidden)) {
            results.push(fullPath);
          }
        }
      }
      return results;
    }

    const srcMatches = scanDir(path.join(projectRoot, 'src'));
    const publicMatches = scanDir(path.join(projectRoot, 'public'));

    expect(srcMatches, `Arquivos com trait proibido em src/: ${srcMatches.join(', ')}`).toEqual([]);
    expect(publicMatches, `Arquivos com trait proibido em public/: ${publicMatches.join(', ')}`).toEqual([]);
  });
});
