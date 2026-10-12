import { describe, it, expect } from 'vitest';
import { VersionCatalog } from '@/types/silentgear';
import atm11Json from '../../public/data/versions/atm11/catalog.json';

const traits = (atm11Json as unknown as VersionCatalog).traits;

describe('Auditoria #50: catálogo de traits do atm11 contra os jars da instância', () => {
  // max_level de data/*/silentgear_traits/*.json em silent-gear 4.2.3 e kubejs/dynamic_data
  it.each([
    ['silentgear:advanced_aquatic', 5],
    ['silentgear:bulky', 5],
    ['silentgear:dulling', 5],
    ['silentgear:fiery', 2],
    ['silentgear:flutter', 5],
    ['silentgear:lucky', 7],
    ['silentgear:malleable', 5],
    ['silentgear:yummy', 1],
  ])('%s tem maxLevel %i', (id, maxLevel) => {
    expect(traits[id]?.maxLevel).toBe(maxLevel);
  });

  it('define os traits que materiais e partes do ATM11 referenciam e hoje faltam', () => {
    const missing = [
      'silentgear:bastion', 'silentgear:confetti', 'silentgear:crackler', 'silentgear:cursed',
      'silentgear:floatstoner', 'silentgear:heavy', 'silentgear:ignite', 'silentgear:jabberwocky',
      'silentgear:kitty_vision', 'silentgear:mighty', 'silentgear:multi_break', 'silentgear:oxidized',
      'silentgear:racker', 'silentgear:red_card', 'silentgear:road_maker', 'silentgear:spoon',
      'silentgear:terminus', 'silentgear:venom', 'silentgear:widen', 'silentgems:booster',
      'silentgems:cloaking', 'silentgems:hasty', 'silentgems:hearty', 'silentgems:leaping',
      'silentgems:power', 'silentgems:step_up', 'silentgems:twinkletoes',
    ].filter((id) => !traits[id]);

    expect(missing).toEqual([]);
  });
});
