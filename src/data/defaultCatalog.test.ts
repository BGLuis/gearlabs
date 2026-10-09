import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  OFFICIAL_MATERIALS_1_20,
  OFFICIAL_MATERIALS_1_21,
  OFFICIAL_GEAR_TYPES,
} from './defaultCatalog';
import { ATM11_MATERIALS } from '../../tests/fixtures/atm11Materials';
import { VersionCatalog } from '@/types/silentgear';

// Cores oficiais do display.color (sem canal alfa #AARRGGBB -> #RRGGBB)
// extraídas das fontes oficiais do mod Silent Gear 4.2.3 e ATM-11
export const EXPECTED_MATERIAL_COLORS: Record<string, string> = {
  'silentgear:iron': '#FFFFFF',
  'silentgear:diamond': '#33EBCB',
  'silentgear:netherite': '#867B86',
  'silentgear:crimson_iron': '#FF6189',
  'silentgear:crimson_steel': '#DC143C',
  'silentgear:azure_silver': '#CBBAFF',
  'silentgear:azure_electrum': '#4575E3',
  'silentgear:gold': '#FDFF70',
  'silentgear:copper': '#FD804C',
  'silentgear:wood': '#896727',
  'silentgear:breeze_rod': '#9398C1',
  'silentgear:allthemodium': '#FFEF0E',
  'silentgear:vibranium': '#26DE88',
  'silentgear:unobtainium': '#D152E3',
  'sgearmetalworks:uru_metal': '#0B2037',
  'silentgear:tyrian_steel': '#B01080',
  'silentgear:wool': '#FFFFFF',
};

describe('Catálogo Padrão - Cores dos Materiais (Issue #12)', () => {
  it('garante que silentgear:azure_silver tem color #CBBAFF', () => {
    expect(ATM11_MATERIALS['silentgear:azure_silver']?.color).toBe('#CBBAFF');
    expect(OFFICIAL_MATERIALS_1_20['silentgear:azure_silver']?.color).toBe('#CBBAFF');
    expect(OFFICIAL_MATERIALS_1_21['silentgear:azure_silver']?.color).toBe('#CBBAFF');
  });

  it('para cada material em ATM11_MATERIALS, color bate com display.color oficial', () => {
    for (const [id, material] of Object.entries(ATM11_MATERIALS)) {
      const expectedColor = EXPECTED_MATERIAL_COLORS[id];
      expect(
        expectedColor,
        `Material ${id} deve ter cor oficial mapeada em EXPECTED_MATERIAL_COLORS`
      ).toBeDefined();
      expect(material.color.toUpperCase()).toBe(expectedColor.toUpperCase());
    }
  });

  it('para cada material em OFFICIAL_MATERIALS_1_20, color bate com display.color oficial', () => {
    for (const [id, material] of Object.entries(OFFICIAL_MATERIALS_1_20)) {
      const expectedColor = EXPECTED_MATERIAL_COLORS[id];
      expect(
        expectedColor,
        `Material ${id} deve ter cor oficial mapeada em EXPECTED_MATERIAL_COLORS`
      ).toBeDefined();
      expect(material.color.toUpperCase()).toBe(expectedColor.toUpperCase());
    }
  });

  it('para cada material nos catálogos JSON exportados em public/data/versions, color bate com display.color oficial', () => {
    const versionsDir = path.resolve(__dirname, '../../public/data/versions');
    const versionDirs = fs.readdirSync(versionsDir);

    expect(versionDirs.length).toBeGreaterThan(0);

    for (const version of versionDirs) {
      const catalogPath = path.join(versionsDir, version, 'catalog.json');
      if (!fs.existsSync(catalogPath)) continue;

      const raw = fs.readFileSync(catalogPath, 'utf-8');
      const catalog: VersionCatalog = JSON.parse(raw);

      for (const [id, material] of Object.entries(catalog.materials)) {
        expect(material.color, `Versão ${version} - Material ${id} deve ter cor hex`).toMatch(/^#[0-9A-Fa-f]{6}$/);
        const expectedColor = EXPECTED_MATERIAL_COLORS[id];
        if (expectedColor) {
          expect(material.color.toUpperCase()).toBe(expectedColor.toUpperCase());
        }
      }
    }
  });
});

describe('Tipos de Equipamento Manuais vs Partes Principais do Mod (Issue #39)', () => {
  const partsDir = path.resolve(__dirname, '../../data/silentgear/silentgear_parts');
  const mainPartByGearType: Record<string, string> = {
    sword: 'sword_blade',
    katana: 'katana_blade',
    pickaxe: 'pickaxe_head',
    axe: 'axe_head',
    helmet: 'helmet_plates',
    chestplate: 'chestplate_plates',
    leggings: 'legging_plates',
    boots: 'boot_plates',
  };

  it.each(Object.entries(mainPartByGearType))(
    '%s: dano e velocidade base batem com a parte principal do mod',
    (gearTypeId, partFile) => {
      const part = JSON.parse(fs.readFileSync(path.join(partsDir, `${partFile}.json`), 'utf8'));
      const gearType = OFFICIAL_GEAR_TYPES[gearTypeId];
      expect(gearType, `tipo ${gearTypeId} ausente em OFFICIAL_GEAR_TYPES`).toBeDefined();
      expect(part.properties, `${partFile}.json sem properties`).toBeDefined();

      expect(gearType.baseDamage).toBe(part.properties.attack_damage?.value ?? 0);
      expect(gearType.baseAttackSpeed).toBe(part.properties.attack_speed?.value ?? 0);
    }
  );

  it('katana: durabilityMultiplier é 1 + MULTIPLY_BASE da lâmina do mod', () => {
    const part = JSON.parse(fs.readFileSync(path.join(partsDir, 'katana_blade.json'), 'utf8'));
    expect(OFFICIAL_GEAR_TYPES.katana.durabilityMultiplier).toBe(1 + part.properties.durability.value);
  });
});
