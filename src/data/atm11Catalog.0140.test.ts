import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { Material, MaterialTraitRef, PartSlot, VersionCatalog } from '@/types/silentgear';
import { ATM11_DIR } from '../../tests/helpers/atm11-catalog';

const VERSION = '0.14.0-beta';
const DUMP = path.resolve(__dirname, `../../tests/fixtures/material_export.atm11-${VERSION}.tsv`);

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const PART_BY_DUMP_TYPE: Record<string, PartSlot> = { Main: 'main', 'Tip Upgrade': 'tip', 'Tool Rod': 'rod' };
const MATERIALS = ['silentgear:allthemodium', 'silentgear:vibranium', 'silentgear:unobtainium'];

const catalog = JSON.parse(
  fs.readFileSync(path.join(ATM11_DIR, VERSION, 'catalog.json'), 'utf-8')
) as VersionCatalog;

/**
 * O dump escreve "Nome Nível" (sem o nível quando o trait tem maxLevel 1) e põe `*` nos traits
 * que têm condição (gear type, ratio...), seja na referência do material ou na definição do trait.
 */
function dumpLabel(ref: MaterialTraitRef): string {
  const trait = catalog.traits[ref.name];
  const name = trait?.name.en ?? ref.name;
  const level = trait?.maxLevel === 1 ? '' : ` ${ROMAN[ref.level]}`;
  return `${name}${level}${ref.conditions?.length || trait?.conditions?.length ? '*' : ''}`;
}

function dumpTraits(material: Material, slot: PartSlot): string[] {
  return (material.traits[slot] ?? []).map(dumpLabel);
}

describe(`Catálogo ATM11 ${VERSION} contra o dump /sgear_mats do jogo (#98)`, () => {
  const [header, ...rows] = fs.readFileSync(DUMP, 'utf-8').trim().split('\n').map((l) => l.split('\t'));
  const col = (name: string) => header.indexOf(name);

  for (const id of MATERIALS) {
    it(`${id} tem no catálogo os mesmos traits do jogo em main, tip e rod`, () => {
      const material = catalog.materials[id];
      expect(material, `${id} deve existir no catálogo ${VERSION}`).toBeDefined();
      const dumped = rows.filter((r) => r[col('ID')] === id && PART_BY_DUMP_TYPE[r[col('Type')]]);
      expect(dumped.map((r) => PART_BY_DUMP_TYPE[r[col('Type')]]).sort()).toEqual(['main', 'rod', 'tip']);
      for (const row of dumped) {
        const slot = PART_BY_DUMP_TYPE[row[col('Type')]];
        const expected = row[col('Traits')].split(', ').filter(Boolean);
        expect(dumpTraits(material, slot), `${id} (${slot})`).toEqual(expected);
      }
    });
  }
});
