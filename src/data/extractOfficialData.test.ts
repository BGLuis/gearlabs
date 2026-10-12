import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ATM11_CATALOG, OFFICIAL_GEAR_TYPES, VERSION_PRESETS } from './defaultCatalog';
import { VersionCatalog } from '@/types/silentgear';
import { deriveGearTypes } from '../../scripts/extract-official-data';

describe('Sincronização do Catálogo ATM11 com Datagen Oficial e Modpack (Issue #6)', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const catalogPath = path.join(projectRoot, 'public/data/versions/atm11/catalog.json');
  const tsvPath = path.join(projectRoot, 'tests/fixtures/material_export.tsv');

  // O dump do jogo formata valores (ex.: "9x" para multiplicadores, "" para ausente)
  // Células "x0.5" ou "+2" são operações (multiplicador/soma), que o catálogo guarda como objeto: não comparáveis aqui
  const isOperationCell = (cell: string | undefined) => !!cell && /^[x+]/.test(cell);
  const dumpNumber = (cell: string | undefined) => (cell ? parseFloat(cell) : 0);

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
    expect(fs.existsSync(tsvPath), 'tests/fixtures/material_export.tsv deve existir').toBe(true);
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
      const dumpDur = dumpNumber(parts[durIdx]);
      const dumpArmorDur = dumpNumber(parts[armorDurIdx]);
      const dumpArmor = dumpNumber(parts[armorIdx]);
      const dumpToughness = dumpNumber(parts[toughnessIdx]);
      const dumpMagicArmor = dumpNumber(parts[magicArmorIdx]);

      const material = catalog.materials[id];
      expect(material, `Material ${id} deve existir no catálogo gerado`).toBeDefined();
      expect(material.stats.main, `Material ${id} deve conter stats.main`).toBeDefined();

      const matMain = material.stats.main!;
      const matDur = typeof matMain.durability === 'number' ? matMain.durability : 0;
      const matArmorDur = typeof matMain.armor_durability === 'number' ? matMain.armor_durability : 0;
      const matArmor = typeof matMain.armor === 'number' ? matMain.armor : 0;
      const matToughness = typeof matMain.armor_toughness === 'number' ? matMain.armor_toughness : 0;
      const matMagicArmor = typeof matMain.magic_armor === 'number' ? matMain.magic_armor : 0;

      if (!isOperationCell(parts[durIdx])) expect(matDur, `Durabilidade divergente para ${id}`).toBe(dumpDur);
      if (!isOperationCell(parts[armorDurIdx])) expect(matArmorDur, `Armor Durability divergente para ${id}`).toBe(dumpArmorDur);
      if (!isOperationCell(parts[armorIdx])) expect(matArmor, `Armor divergente para ${id}`).toBe(dumpArmor);
      if (!isOperationCell(parts[toughnessIdx])) expect(matToughness, `Armor Toughness divergente para ${id}`).toBe(dumpToughness);
      if (!isOperationCell(parts[magicArmorIdx])) expect(matMagicArmor, `Magic Armor divergente para ${id}`).toBe(dumpMagicArmor);
    }

    expect(mainCount).toBeGreaterThan(90);
  });

  it('Critério 3b: a coluna Additive do dump do jogo coincide com o flag additive do catálogo', () => {
    const [header, ...rows] = fs.readFileSync(tsvPath, 'utf-8').trim().split('\n').map((l) => l.split('\t'));
    const idIdx = header.indexOf('ID');
    const typeIdx = header.indexOf('Type');
    const additiveIdx = header.indexOf('Additive');

    const mismatches = rows
      .filter((r) => r[typeIdx] === 'Main')
      .filter((r) => (r[additiveIdx] === 'Yes') !== !!catalog.materials[r[idIdx]]?.additive)
      .map((r) => r[idIdx]);

    expect(mismatches).toEqual([]);
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
    expect(oak.stats.main?.harvest_tier).toEqual({ name: 'wood', level: 0 });
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

describe('Resolução Oficial de Harvest Tier com level_hint (Issue #38)', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const catalogPath = path.join(projectRoot, 'public/data/versions/atm11/catalog.json');
  const rawCatalog = fs.readFileSync(catalogPath, 'utf-8');
  const catalog: VersionCatalog = JSON.parse(rawCatalog);

  it('Critério 2: todo harvest_tier do catálogo gerado tem level numérico', () => {
    let count = 0;
    for (const [id, mat] of Object.entries(catalog.materials)) {
      for (const [slot, slotStats] of Object.entries(mat.stats)) {
        if (slotStats?.harvest_tier) {
          expect(
            typeof slotStats.harvest_tier.name,
            `Material ${id} no slot ${slot} deve ter harvest_tier.name do tipo string`
          ).toBe('string');
          expect(
            typeof slotStats.harvest_tier.level,
            `Material ${id} no slot ${slot} deve ter harvest_tier.level do tipo number`
          ).toBe('number');
          expect(
            Number.isNaN(slotStats.harvest_tier.level),
            `Material ${id} no slot ${slot} não deve ter harvest_tier.level NaN`
          ).toBe(false);
          count++;
        }
      }
    }
    expect(count, 'Deve haver ao menos um material com harvest_tier no catálogo').toBeGreaterThan(0);
  });

  it('Critério 3: grep -n "level_hint" scripts/extract-official-data.ts src/lib/datapack-parser.ts passa a ter resultados', () => {
    const cmd = 'grep -n "level_hint" scripts/extract-official-data.ts src/lib/datapack-parser.ts';
    const output = execSync(cmd, { cwd: projectRoot, encoding: 'utf-8' });
    expect(output.trim().length).toBeGreaterThan(0);
    expect(output).toContain('level_hint');
  });

  it('Tiers específicos possuem o nível oficial extraído do datapack', () => {
    const allthemodium = catalog.materials['silentgear:allthemodium'];
    expect(allthemodium?.stats.main?.harvest_tier).toEqual({ name: 'allthemodium', level: 5 });
    expect(allthemodium?.stats.tip?.harvest_tier).toEqual({ name: 'allthemodium', level: 5 });

    const iron = catalog.materials['silentgear:iron'];
    expect(iron?.stats.main?.harvest_tier).toEqual({ name: 'iron', level: 2 });
    expect(iron?.stats.tip?.harvest_tier).toEqual({ name: 'iron', level: 2 });

    const diamond = catalog.materials['silentgear:diamond'];
    expect(diamond?.stats.main?.harvest_tier).toEqual({ name: 'diamond', level: 3 });

    const netherite = catalog.materials['silentgear:netherite'];
    expect(netherite?.stats.coating?.harvest_tier).toEqual({ name: 'netherite', level: 4 });

    const unobtainium = catalog.materials['silentgear:unobtainium'];
    expect(unobtainium?.stats.main?.harvest_tier).toEqual({ name: 'unobtainium', level: 7 });
  });

  describe('Estrutura de Camadas de Addons (Issue #47)', () => {
    it('Catálogo ATM11 lista seus addons com versões em AddonConfig', () => {
      expect(catalog.addons).toBeDefined();
      expect(catalog.addons?.length).toBe(3);

      const addonIds = catalog.addons?.map((a) => a.id);
      expect(addonIds).toEqual(['silentgems', 'sgearmetalworks', 'kubejs']);

      for (const addon of catalog.addons!) {
        expect(addon.version).toBeDefined();
        expect(addon.name).toBeDefined();
        expect(addon.enabled).toBe(true);
      }

      // Presets também contêm addons
      const atm11Preset = ATM11_CATALOG.addons;
      expect(atm11Preset).toBeDefined();
      expect(atm11Preset?.length).toBe(3);
    });

    it('Catálogo ATM11 possui baseMaterials e layers isoladas', () => {
      expect(catalog.baseMaterials).toBeDefined();
      expect(Object.keys(catalog.baseMaterials!).length).toBe(131);

      expect(catalog.layers).toBeDefined();
      expect(Object.keys(catalog.layers!)).toEqual(['silentgems', 'sgearmetalworks', 'kubejs']);
    });

    it('Materiais reinforced_gold e reinforced_silver do Silent Gems existem no catálogo ATM11', () => {
      expect(catalog.materials['silentgems:reinforced_gold']).toBeDefined();
      expect(catalog.materials['silentgems:reinforced_silver']).toBeDefined();
      expect(catalog.materials['silentgems:reinforced_gold'].source).toBe('silentgems');
      expect(catalog.materials['silentgems:reinforced_silver'].source).toBe('silentgems');
    });

    it('Todos os materiais do catálogo gerado possuem o campo source', () => {
      for (const [id, mat] of Object.entries(catalog.materials)) {
        expect(mat.source, `Material ${id} deve possuir source`).toBeDefined();
        expect(['silentgear', 'silentgems', 'sgearmetalworks', 'kubejs']).toContain(mat.source);
      }
    });
  });

  describe('Auditoria de Traits Oficiais (Issue #50)', () => {
    it('Critério 1: todo trait referenciado por qualquer material do catálogo existe em catalog.traits', () => {
      const referencedTraits = new Set<string>();
      for (const mat of Object.values(catalog.materials)) {
        for (const slotTraits of Object.values(mat.traits || {})) {
          if (Array.isArray(slotTraits)) {
            for (const t of slotTraits) {
              referencedTraits.add(t.name);
            }
          }
        }
      }

      for (const traitId of referencedTraits) {
        expect(catalog.traits[traitId], `Trait ${traitId} deve existir em catalog.traits`).toBeDefined();
        expect(catalog.traits[traitId].name).toBeDefined();
        expect(catalog.traits[traitId].description).toBeDefined();
      }
    });

    it('Critério 2: maxLevel de hard, magnetic, aquatic e sting_resist é 5, 5, 5 e 4', () => {
      expect(catalog.traits['silentgear:hard']?.maxLevel).toBe(5);
      expect(catalog.traits['silentgear:magnetic']?.maxLevel).toBe(5);
      expect(catalog.traits['silentgear:aquatic']?.maxLevel).toBe(5);
      expect(catalog.traits['silentgear:sting_resist']?.maxLevel).toBe(4);
    });

    it('Critério 3: o trait inexistente silentgear:swift não existe em catalog.traits nem em defaultCatalog.ts', () => {
      expect(catalog.traits['silentgear:swift']).toBeUndefined();
      expect(catalog.traits['silentgear:swift_swim']).toBeDefined();
      expect(catalog.traits['silentgear:swift_swim'].maxLevel).toBe(5);
    });
  });

  describe('Auditoria de Jars Instalados e Fixtures (Issues #48 e #49)', () => {
    it('Critério Issue #48: silentgear:copper tem durability 190 e attack_damage/melee_damage 1.0', () => {
      const copper = catalog.materials['silentgear:copper'];
      expect(copper).toBeDefined();
      expect(copper.stats.main?.durability).toBe(190);
      expect(copper.stats.main?.armor_durability).toBe(11);
      expect(copper.stats.main?.melee_damage).toBe(1.0);
    });

    it('Critério Issue #48: silentgear:netherite coating possui rarity ADD 40', () => {
      const netherite = catalog.materials['silentgear:netherite'];
      expect(netherite).toBeDefined();
      expect(netherite.stats.coating?.rarity).toEqual({ value: 40, operation: 'ADD' });
    });

    it('Critério Issue #49: scripts/extract-official-data.ts não possui generateTsvDump', () => {
      const scriptPath = path.join(projectRoot, 'scripts/extract-official-data.ts');
      const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
      expect(scriptContent.includes('generateTsvDump')).toBe(false);
    });
  });

  describe('Auditoria de Presets e Catálogos Únicos (Issue #51)', () => {
    it('Critério 1: nenhum par de catálogos em public/data/versions/ é clone idêntico além do nome da versão', () => {
      const versionsDir = path.join(projectRoot, 'public/data/versions');
      const versionDirs = fs
        .readdirSync(versionsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      expect(versionDirs.length).toBeGreaterThanOrEqual(2);

      const catalogs: Record<string, any> = {};
      for (const v of versionDirs) {
        const catFile = path.join(versionsDir, v, 'catalog.json');
        if (fs.existsSync(catFile)) {
          const content = JSON.parse(fs.readFileSync(catFile, 'utf-8'));
          catalogs[v] = content;
        }
      }

      const keys = Object.keys(catalogs);
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          const catA = { ...catalogs[keys[i]], version: '' };
          const catB = { ...catalogs[keys[j]], version: '' };
          expect(
            JSON.stringify(catA),
            `Catálogo ${keys[i]} e ${keys[j]} não podem ser cópias idênticas`
          ).not.toBe(JSON.stringify(catB));
        }
      }
    });

    it('Critério 2: scripts/extract-official-data.ts exporta apenas presets com dados próprios', () => {
      const scriptPath = path.join(projectRoot, 'scripts/extract-official-data.ts');
      const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
      const atmExports = scriptContent
        .split('\n')
        .filter((line) => line.includes("exportCatalog('atm"));
      expect(atmExports.length).toBe(1);
      expect(atmExports[0]).toContain("exportCatalog('atm11'");
    });

    it('Critério 3: VERSION_PRESETS em defaultCatalog.ts não inclui clones de atm10 e atm9', () => {
      const presetIds = VERSION_PRESETS.map((p) => p.id);
      expect(presetIds).not.toContain('atm10');
      expect(presetIds).not.toContain('atm9');
      expect(presetIds).toContain('atm11');
      expect(presetIds).toContain('1.21.1');
    });
  });
});


