import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ATM11_CATALOG, OFFICIAL_GEAR_TYPES } from './defaultCatalog';
import { VersionCatalog } from '@/types/silentgear';
import { deriveGearTypes } from '../../scripts/extract-official-data';

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
    expect(mat.stats.main?.by_type?.armor?.helmet).toBe(15);
    expect(mat.stats.main?.by_type?.armor?.chestplate).toBe(15);
    expect(mat.stats.main?.by_type?.armor?.leggings).toBe(15);
    expect(mat.stats.main?.by_type?.armor?.boots).toBe(15);
    expect(mat.stats.main?.armor_toughness).toBe(60);
    expect(mat.stats.main?.magic_armor).toBe(200);
    expect(mat.stats.main?.armor_durability).toBe(60);

    // Também no catálogo padrão em TypeScript
    const defaultMat = ATM11_CATALOG.materials['silentgear:allthemodium'];
    expect(defaultMat).toBeDefined();
    expect(defaultMat.stats.main?.armor).toBe(60);
    expect(defaultMat.stats.main?.by_type?.armor?.helmet).toBe(15);
    expect(defaultMat.stats.main?.armor_toughness).toBe(60);
    expect(defaultMat.stats.main?.magic_armor).toBe(200);
    expect(defaultMat.stats.main?.armor_durability).toBe(60);
  });

  it('Issue #40: silentgear:turtle tem armor_durability 25 só para helmet no catálogo ATM11', () => {
    const turtle = catalog.materials['silentgear:turtle'];
    expect(turtle.stats.main?.by_type?.armor_durability).toEqual({ helmet: 25 });
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

describe('Derivação de Slots Opcionais por Tipo de Equipamento (Issue #63)', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const catalogPath = path.join(projectRoot, 'public/data/versions/atm11/catalog.json');
  const rawCatalog = fs.readFileSync(catalogPath, 'utf-8');
  const catalog: VersionCatalog = JSON.parse(rawCatalog);

  it('Critério 1: espada oferece tip, grip, coating, binding; armadura oferece tip, lining, coating, binding', () => {
    expect(OFFICIAL_GEAR_TYPES.sword.optionalSlots).toEqual(['tip', 'grip', 'coating', 'binding']);
    expect(OFFICIAL_GEAR_TYPES.katana.optionalSlots).toEqual(['tip', 'grip', 'coating', 'binding']);
    expect(OFFICIAL_GEAR_TYPES.pickaxe.optionalSlots).toEqual(['tip', 'grip', 'coating', 'binding']);
    expect(OFFICIAL_GEAR_TYPES.axe.optionalSlots).toEqual(['tip', 'grip', 'coating', 'binding']);

    expect(OFFICIAL_GEAR_TYPES.helmet.optionalSlots).toEqual(['tip', 'lining', 'coating', 'binding']);
    expect(OFFICIAL_GEAR_TYPES.chestplate.optionalSlots).toEqual(['tip', 'lining', 'coating', 'binding']);
    expect(OFFICIAL_GEAR_TYPES.leggings.optionalSlots).toEqual(['tip', 'lining', 'coating', 'binding']);
    expect(OFFICIAL_GEAR_TYPES.boots.optionalSlots).toEqual(['tip', 'lining', 'coating', 'binding']);

    const atm11GearTypes = catalog.gearTypes;
    expect(atm11GearTypes.sword.optionalSlots).toEqual(['tip', 'grip', 'coating', 'binding']);
    expect(atm11GearTypes.helmet.optionalSlots).toEqual(['tip', 'lining', 'coating', 'binding']);
    expect(atm11GearTypes.chestplate.optionalSlots).toEqual(['tip', 'lining', 'coating', 'binding']);
    expect(atm11GearTypes.leggings.optionalSlots).toEqual(['tip', 'lining', 'coating', 'binding']);
    expect(atm11GearTypes.boots.optionalSlots).toEqual(['tip', 'lining', 'coating', 'binding']);
  });

  it('Critério 2 (Snapshot): para cada tipo de OFFICIAL_GEAR_TYPES, os slots coincidem com os gear_type das partes', () => {
    const derived = deriveGearTypes(OFFICIAL_GEAR_TYPES, projectRoot);

    for (const [id, gearType] of Object.entries(OFFICIAL_GEAR_TYPES)) {
      expect(
        gearType.optionalSlots,
        `Slots opcionais de ${id} devem coincidir com os derivados das partes oficiais`
      ).toEqual(derived[id].optionalSlots);
    }

    const slotSnapshot = Object.fromEntries(
      Object.entries(OFFICIAL_GEAR_TYPES).map(([id, gt]) => [id, gt.optionalSlots])
    );
    expect(slotSnapshot).toMatchInlineSnapshot(`
      {
        "axe": [
          "tip",
          "grip",
          "coating",
          "binding",
        ],
        "boots": [
          "tip",
          "lining",
          "coating",
          "binding",
        ],
        "chestplate": [
          "tip",
          "lining",
          "coating",
          "binding",
        ],
        "helmet": [
          "tip",
          "lining",
          "coating",
          "binding",
        ],
        "katana": [
          "tip",
          "grip",
          "coating",
          "binding",
        ],
        "leggings": [
          "tip",
          "lining",
          "coating",
          "binding",
        ],
        "pickaxe": [
          "tip",
          "grip",
          "coating",
          "binding",
        ],
        "sword": [
          "tip",
          "grip",
          "coating",
          "binding",
        ],
      }
    `);
  });

  it('Critério 3: grep -n "optionalSlots: [\'lining\', \'coating\']" src/data/defaultCatalog.ts retorna 0 resultados', () => {
    const defaultCatalogPath = path.join(projectRoot, 'src/data/defaultCatalog.ts');
    const content = fs.readFileSync(defaultCatalogPath, 'utf-8');
    const matches = content.match(/optionalSlots:\s*\['lining',\s*'coating'\]/g);
    expect(matches).toBeNull();
  });
});

describe('Resolução de IDs aninhados e Herança de Parent (Issue #46)', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const catalogPath = path.join(projectRoot, 'public/data/versions/atm11/catalog.json');
  const rawCatalog = fs.readFileSync(catalogPath, 'utf-8');
  const catalog: VersionCatalog = JSON.parse(rawCatalog);

  it('Critério 1: o catálogo gerado contém silentgear:wool/white, silentgear:wood/oak etc. com os stats do pai', () => {
    // 1. Madeiras
    const oak = catalog.materials['silentgear:wood/oak'];
    expect(oak, 'silentgear:wood/oak deve existir no catálogo').toBeDefined();
    expect(oak.name.en).toBe('Oak Wood');
    expect(oak.name.pt).toBe('Madeira de Carvalho');
    expect(oak.stats.main?.durability).toBe(59);
    expect(oak.stats.main?.armor).toBe(7);
    expect(oak.stats.main?.harvest_tier).toBe('wood');
    expect(oak.stats.rod).toBeDefined();

    // 2. Lãs
    const whiteWool = catalog.materials['silentgear:wool/white'];
    expect(whiteWool, 'silentgear:wool/white deve existir no catálogo').toBeDefined();
    expect(whiteWool.name.en).toBe('White Wool');
    expect(whiteWool.name.pt).toBe('Lã Branca');
    expect(whiteWool.stats.main?.armor).toBe(4);
    expect(whiteWool.stats.main?.armor_durability).toBe(4);

    // 3. Terracotas
    const whiteTerracotta = catalog.materials['silentgear:terracotta/white'];
    expect(whiteTerracotta, 'silentgear:terracotta/white deve existir no catálogo').toBeDefined();
    expect(whiteTerracotta.name.en).toBe('White Terracotta');
    expect(whiteTerracotta.stats.main?.durability).toBe(165);

    // 4. Pedras e Arenito
    const granite = catalog.materials['silentgear:stone/granite'];
    expect(granite, 'silentgear:stone/granite deve existir no catálogo').toBeDefined();
    expect(granite.stats.main?.durability).toBe(131);

    const redSandstone = catalog.materials['silentgear:sandstone/red'];
    expect(redSandstone, 'silentgear:sandstone/red deve existir no catálogo').toBeDefined();
    expect(redSandstone.stats.main?.durability).toBe(117);
  });

  it('Critério 2: nenhum ID truncado colidente como silentgear:red, silentgear:oak, silentgear:white existe', () => {
    const invalidIds = [
      'silentgear:red',
      'silentgear:oak',
      'silentgear:white',
      'silentgear:granite',
      'silentgear:diorite',
      'silentgear:andesite',
      'silentgear:birch',
      'silentgear:spruce',
    ];
    for (const invalidId of invalidIds) {
      expect(catalog.materials[invalidId], `ID colidente ${invalidId} não deve existir no catálogo`).toBeUndefined();
    }
  });

  it('Critério 3: silentgear:wool/white possui stats no slot lining', () => {
    const whiteWool = catalog.materials['silentgear:wool/white'];
    expect(whiteWool).toBeDefined();
    expect(whiteWool.stats.lining).toBeDefined();
    expect(whiteWool.stats.lining?.knockback_resistance).toEqual({ operation: 'ADD', value: 0.1 });
    expect(whiteWool.traits.lining).toEqual([{ name: 'silentgear:flexible', level: 2 }]);
  });

  it('Critério 4: entradas sem stats de principal ou haste só restam para materiais que legitimamente não os têm', () => {
    const missingMainAndRod: string[] = [];
    for (const [id, mat] of Object.entries(catalog.materials)) {
      if (!mat.stats?.main && !mat.stats?.rod) {
        missingMainAndRod.push(id);
      }
    }

    // Apenas ligas compostas, netherite (apenas coating) e materiais exclusivos de utilidade (corda/lining/setting)
    const expectedWithoutMainOrRod = [
      'silentgear:crude_alloy',
      'silentgear:fine_silk',
      'silentgear:flax',
      'silentgear:fluffy_string',
      'silentgear:hybrid_gem',
      'silentgear:metal_alloy',
      'silentgear:mixed_fabric',
      'silentgear:netherite',
      'silentgear:prismarine',
      'silentgear:sinew',
      'silentgear:slime',
      'silentgear:string',
      'silentgear:super_alloy',
      'silentgear:vine',
    ];

    expect(missingMainAndRod.sort()).toEqual(expectedWithoutMainOrRod.sort());
  });
});

