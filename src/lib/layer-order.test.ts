import { describe, it, expect } from 'vitest';
import { deriveLayerOrder as deriveSlots, parseModsToml, type ModOrdering } from '@/lib/layer-order';

const deriveLayerOrder = (jars: ModOrdering[], scriptRoots: string[]) => deriveSlots(jars, scriptRoots).map((slot) => slot.id);

const mod = (modId: string, after: string[] = [], before: string[] = []): ModOrdering => ({ modId, after, before });

describe('deriveLayerOrder (#93, regra medida no #106)', () => {
  it('sem relação entre os mods, o id maior carrega depois e vence', () => {
    expect(deriveLayerOrder([mod('zzz_probe'), mod('aaa_probe')], [])).toEqual(['aaa_probe', 'zzz_probe']);
  });

  it('AFTER coloca o mod depois da dependência mesmo contra o alfabeto', () => {
    expect(deriveLayerOrder([mod('aaa', ['zzz']), mod('zzz')], [])).toEqual(['zzz', 'aaa']);
  });

  it('BEFORE coloca o mod antes da dependência mesmo contra o alfabeto (rodada 4)', () => {
    expect(deriveLayerOrder([mod('aaa'), mod('zzz', [], ['aaa'])], [])).toEqual(['zzz', 'aaa']);
  });

  it('AFTER a favor do alfabeto não muda nada (rodada 3)', () => {
    expect(deriveLayerOrder([mod('aaa'), mod('zzz', ['aaa'])], [])).toEqual(['aaa', 'zzz']);
  });

  it('ignora dependência de mod ausente, inclusive opcional', () => {
    expect(deriveLayerOrder([mod('b', ['silentgems']), mod('a')], [])).toEqual(['a', 'b']);
  });

  it('ignora neoforge e minecraft mesmo presentes', () => {
    expect(deriveLayerOrder([mod('a', ['neoforge', 'minecraft']), mod('neoforge'), mod('minecraft')], [])).toEqual([
      'a',
      'minecraft',
      'neoforge',
    ]);
  });

  it('reproduz o caso real: sgearmetalworks vem depois de silentgear e silentgems', () => {
    const jars = [mod('sgearmetalworks', ['silentgear', 'silentgems']), mod('silentgems'), mod('silentgear')];
    expect(deriveLayerOrder(jars, [])).toEqual(['silentgear', 'silentgems', 'sgearmetalworks']);
  });

  it('a relação vale por intermediário: a AFTER b, b AFTER c', () => {
    expect(deriveLayerOrder([mod('a', ['b']), mod('b', ['c']), mod('c')], [])).toEqual(['c', 'b', 'a']);
  });

  it('as raízes de script vêm depois de todos os jars, em ordem alfabética', () => {
    expect(deriveLayerOrder([mod('zzz'), mod('aaa')], ['kubejs', 'kubegroovy'])).toEqual([
      'aaa',
      'zzz',
      'kubegroovy',
      'kubejs',
    ]);
  });

  it('o mod kubegroovy e a raiz de script kubegroovy são dois pacotes distintos, o de script por último', () => {
    expect(deriveSlots([mod('kubegroovy'), mod('aaa')], ['kubegroovy'])).toEqual([
      { id: 'aaa', kind: 'jar' },
      { id: 'kubegroovy', kind: 'jar' },
      { id: 'kubegroovy', kind: 'script' },
    ]);
  });

  it('ciclo é erro e nomeia os mods envolvidos', () => {
    const cycle = [mod('a', ['b']), mod('b', ['c']), mod('c', ['a']), mod('free')];
    expect(() => deriveLayerOrder(cycle, [])).toThrow(/a, b, c/);
  });

  it('AFTER e BEFORE contraditórios entre dois mods formam um ciclo', () => {
    expect(() => deriveLayerOrder([mod('a', ['b']), mod('b', ['a'])], [])).toThrow(/ciclo/i);
    expect(() => deriveLayerOrder([mod('a', [], ['b']), mod('b', [], ['a'])], [])).toThrow(/ciclo/i);
  });

  it('dois mods com o mesmo id são erro', () => {
    expect(() => deriveLayerOrder([mod('a'), mod('a')], [])).toThrow(/a/);
  });
});

describe('parseModsToml', () => {
  const toml = `
modLoader="javafml"
license="x" # comentário
[[mods]] #mandatory
    modId="sgearmetalworks" #mandatory
    version="26.1.2-1.6.0"
    displayName="Silent Gear Metalworks"

[[dependencies.sgearmetalworks]]
    modId="neoforge"
    type="required"
    ordering="NONE"
[[dependencies.sgearmetalworks]]
    modId="silentgear"
    type="required"
    ordering="AFTER"
[[dependencies.sgearmetalworks]]
    modId="silentgems"
    type="optional"
    ordering="after"
[[dependencies.sgearmetalworks]]
    modId='zzz'
    ordering="BEFORE"
[[dependencies.outro]]
    modId="naoconta"
    ordering="AFTER"
`;

  it('lê o id do mod e as relações AFTER/BEFORE só das dependências dele', () => {
    expect(parseModsToml(toml)).toEqual({
      modId: 'sgearmetalworks',
      version: '26.1.2-1.6.0',
      displayName: 'Silent Gear Metalworks',
      after: ['silentgear', 'silentgems'],
      before: ['zzz'],
    });
  });

  it('devolve undefined sem [[mods]]', () => {
    expect(parseModsToml('modLoader="x"\n')).toBeUndefined();
  });
});
