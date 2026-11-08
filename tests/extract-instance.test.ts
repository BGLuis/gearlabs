import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import { extractFromInstance } from '../scripts/extract-official-data';
import { tmpDirs } from './helpers/catalog-instance';
import { buildSyntheticInstance, material, type SyntheticInstance } from './helpers/synthetic-instance';

afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

const NOW = () => new Date('2026-11-08T12:00:00Z');
const MATS = 'data/silentgear/silentgear_materials';
const SCRIPT_MATS = 'dynamic_data/silentgear/silentgear_materials';

const silentgear = {
  file: 'silent-gear-26.1.2-neoforge-4.2.3.jar',
  modId: 'silentgear',
  files: { [`${MATS}/iron.json`]: material('#FFFFFFFF') },
};

const extract = async (spec: SyntheticInstance) => {
  const warnings: string[] = [];
  const data = await extractFromInstance(await buildSyntheticInstance(spec), { now: NOW, warn: (m) => warnings.push(m) });
  return { ...data, warnings };
};

describe('extractFromInstance: jars e pastas de script (#93)', () => {
  it('um jar qualquer com silentgear_materials vira camada com o id do neoforge.mods.toml', async () => {
    const { layers, resolvedMaterials, addons, source } = await extract({
      jars: [
        silentgear,
        { file: 'zz-qualquer-1.0.jar', modId: 'qualquer', files: { 'data/foo/silentgear_materials/bar.json': material() } },
      ],
    });
    expect(Object.keys(layers)).toEqual(['qualquer']);
    expect(layers.qualquer.materials!['foo:bar']).toBeDefined();
    expect(resolvedMaterials['foo:bar'].source).toBe('qualquer');
    expect(addons.map((a) => a.id)).toEqual(['silentgear', 'qualquer']);
    expect(source.files.map((f) => f.modId)).toEqual(['silentgear', 'qualquer']);
  });

  it('a base é o jar de mod id silentgear, qualquer que seja o nome do arquivo', async () => {
    const { baseMaterials } = await extract({ jars: [{ ...silentgear, file: 'renomeado.jar' }] });
    expect(Object.keys(baseMaterials)).toEqual(['silentgear:iron']);
  });

  it('falha sem jar de mod id silentgear', async () => {
    await expect(extract({ jars: [{ file: 'a.jar', modId: 'a', files: { [`${MATS}/x.json`]: material() } }] })).rejects.toThrow(
      /silentgear/
    );
  });

  it('falha com dois jars de mod id silentgear', async () => {
    await expect(extract({ jars: [silentgear, { ...silentgear, file: 'copia.jar' }] })).rejects.toThrow(/silentgear/);
  });

  it('ignora jars sem silentgear_materials', async () => {
    const { layers, source } = await extract({ jars: [silentgear, { file: 'outro.jar', modId: 'outro' }] });
    expect(layers).toEqual({});
    expect(source.files).toHaveLength(1);
  });

  it('kubegroovy com material e kubejs vazia: camada kubegroovy com 1 material e nenhuma camada kubejs', async () => {
    const { layers, addons, source } = await extract({
      jars: [silentgear],
      scripts: { [`kubegroovy/${SCRIPT_MATS}/allthemodium.json`]: material('#FFFFEF0E') },
      emptyDirs: [`kubejs/${SCRIPT_MATS}`],
    });
    expect(Object.keys(layers)).toEqual(['kubegroovy']);
    expect(Object.keys(layers.kubegroovy.materials!)).toEqual(['silentgear:allthemodium']);
    expect(addons.map((a) => a.id)).toEqual(['silentgear', 'kubegroovy']);
    expect(source.files.filter((f) => f.kind === 'script-data').map((f) => f.path)).toEqual([
      `minecraft/kubegroovy/${SCRIPT_MATS}/allthemodium.json`,
    ]);
  });

  it('só kubejs/dynamic_data (formato até a 0.12.0) continua gerando a camada kubejs', async () => {
    const { layers, resolvedMaterials } = await extract({
      jars: [silentgear],
      scripts: { [`kubejs/${SCRIPT_MATS}/allthemodium.json`]: material('#FFFFEF0E') },
    });
    expect(Object.keys(layers)).toEqual(['kubejs']);
    expect(Object.keys(layers.kubejs.materials!)).toEqual(['silentgear:allthemodium']);
    expect(resolvedMaterials['silentgear:allthemodium'].source).toBe('kubejs');
  });

  it('pasta de script só com traits também vira camada, e o trait vai para source.files', async () => {
    const { layers, source } = await extract({
      jars: [silentgear],
      scripts: { 'kubejs/dynamic_data/silentgear/silentgear_traits/x.json': { type: 'silentgear:stat_modifier' } },
    });
    expect(Object.keys(layers)).toEqual(['kubejs']);
    expect(source.files.some((f) => f.path.endsWith('silentgear_traits/x.json') && f.kind === 'script-data')).toBe(true);
  });

  it('kubejs/dynamic_data e kubejs/data viram uma camada só; dynamic_data vence no mesmo arquivo', async () => {
    const { layers, source } = await extract({
      jars: [silentgear],
      scripts: {
        [`kubejs/${SCRIPT_MATS}/a.json`]: material('#FF000001'),
        [`kubejs/data/silentgear/silentgear_materials/a.json`]: material('#FF000002'),
        [`kubejs/data/silentgear/silentgear_materials/b.json`]: material('#FF000003'),
      },
    });
    expect(Object.keys(layers)).toEqual(['kubejs']);
    expect(Object.keys(layers.kubejs.materials!).sort()).toEqual(['silentgear:a', 'silentgear:b']);
    expect(layers.kubejs.materials!['silentgear:a'].color).toBe('#000001');
    // só o arquivo que vence é lido e registrado
    expect(source.files.filter((f) => f.kind === 'script-data').map((f) => f.path)).toEqual([
      `minecraft/kubejs/data/silentgear/silentgear_materials/b.json`,
      `minecraft/kubejs/${SCRIPT_MATS}/a.json`,
    ]);
  });

  it('as camadas seguem a ordem derivada: jars por dependência, depois as raízes de script', async () => {
    const jar = (modId: string, extra: Partial<(typeof silentgear)> & { after?: string[]; before?: string[] } = {}) => ({
      file: `${modId}.jar`,
      modId,
      files: { [`data/${modId}/silentgear_materials/m.json`]: material() },
      ...extra,
    });
    const { layers } = await extract({
      jars: [silentgear, jar('zzz'), jar('aaa', { after: ['zzz'] }), jar('mmm', { before: ['aaa'] })],
      scripts: { [`kubejs/${SCRIPT_MATS}/k.json`]: material(), [`kubegroovy/${SCRIPT_MATS}/g.json`]: material() },
    });
    // silentgear, mmm, zzz (mmm < zzz sem relação) e aaa depois de zzz; mmm antes de aaa
    expect(Object.keys(layers)).toEqual(['mmm', 'zzz', 'aaa', 'kubegroovy', 'kubejs']);
  });

  it('um jar de id menor sem relação perde para o de id maior no mesmo material', async () => {
    const dup = (modId: string, color: string) => ({
      file: `${modId}.jar`,
      modId,
      files: { 'data/silentgear/silentgear_materials/allthemodium.json': material(color) },
    });
    const { resolvedMaterials, layers } = await extract({ jars: [silentgear, dup('zeta', '#FF000009'), dup('alpha', '#FF000001')] });
    expect(Object.keys(layers)).toEqual(['alpha', 'zeta']);
    expect(resolvedMaterials['silentgear:allthemodium'].color).toBe('#000009');
  });

  it('id já existente numa camada anterior vira override; id novo vira material', async () => {
    const { layers, resolvedMaterials } = await extract({
      jars: [
        silentgear,
        {
          file: 'metal.jar',
          modId: 'metal',
          after: ['silentgear'],
          files: {
            'data/silentgear/silentgear_materials/iron.json': material('#FF00AA00'),
            'data/metal/silentgear_materials/novo.json': material(),
          },
        },
      ],
    });
    expect(Object.keys(layers.metal.overrides!)).toEqual(['silentgear:iron']);
    expect(Object.keys(layers.metal.materials!)).toEqual(['metal:novo']);
    expect(resolvedMaterials['silentgear:iron'].source).toBe('silentgear');
    expect(resolvedMaterials['silentgear:iron'].overriddenBy).toEqual(['metal']);
  });

  it('o kubegroovy vence o jar allthemodium no mesmo material, e a ordem termina em kubegroovy', async () => {
    const trait = (t: string) => material('#FFFFEF0E', [t]);
    const { layers, resolvedMaterials } = await extract({
      jars: [
        silentgear,
        { file: 'allthemodium-4.2.0.jar', modId: 'allthemodium', files: { [`${MATS}/allthemodium.json`]: trait('silentgear:jar_trait') } },
      ],
      scripts: { [`kubegroovy/${SCRIPT_MATS}/allthemodium.json`]: trait('silentgear:groovy_trait') },
    });
    expect(Object.keys(layers).at(-1)).toBe('kubegroovy');
    expect(resolvedMaterials['silentgear:allthemodium'].traits.main!.map((t) => t.name)).toEqual(['silentgear:groovy_trait']);
  });

  it('o jar do mod kubegroovy (sem materiais) não duplica nem esconde a camada de script kubegroovy', async () => {
    const { layers, addons } = await extract({
      jars: [silentgear, { file: 'kubegroovy-mod.jar', modId: 'kubegroovy' }],
      scripts: { [`kubegroovy/${SCRIPT_MATS}/g.json`]: material() },
    });
    expect(Object.keys(layers)).toEqual(['kubegroovy']);
    expect(addons.map((a) => a.id)).toEqual(['silentgear', 'kubegroovy']);
  });

  it('um jar com materiais e o id de uma raiz de script é erro', async () => {
    await expect(
      extract({
        jars: [silentgear, { file: 'k.jar', modId: 'kubejs', files: { 'data/k/silentgear_materials/m.json': material() } }],
        scripts: { [`kubejs/${SCRIPT_MATS}/k.json`]: material() },
      })
    ).rejects.toThrow(/kubejs/);
  });

  it('o override carrega o parent do arquivo que reescreve o material', async () => {
    const { layers } = await extract({
      jars: [
        silentgear,
        {
          file: 'metal.jar',
          modId: 'metal',
          after: ['silentgear'],
          files: { 'data/silentgear/silentgear_materials/iron.json': { ...material(), parent: 'silentgear:gold' } },
        },
      ],
    });
    expect(layers.metal.overrides!['silentgear:iron'].parent).toBe('silentgear:gold');
  });

  it('ciclo de ordem entre jars falha a extração nomeando os mods', async () => {
    await expect(
      extract({
        jars: [silentgear, { file: 'a.jar', modId: 'a', after: ['b'] }, { file: 'b.jar', modId: 'b', after: ['a'] }],
      })
    ).rejects.toThrow(/a, b/);
  });

  it('dependência AFTER de mod ausente é ignorada', async () => {
    const { layers } = await extract({
      jars: [
        silentgear,
        { file: 'a.jar', modId: 'a', after: ['silentgems'], files: { 'data/a/silentgear_materials/m.json': material() } },
      ],
    });
    expect(Object.keys(layers)).toEqual(['a']);
  });

  it('um jar que carrega antes da base perde para ela nos ids que as duas definem, com aviso', async () => {
    const { layers, resolvedMaterials, warnings } = await extract({
      jars: [
        silentgear,
        {
          file: 'a.jar',
          modId: 'a',
          files: {
            'data/silentgear/silentgear_materials/iron.json': material('#FF00AA00'),
            'data/a/silentgear_materials/m.json': material(),
          },
        },
      ],
    });
    expect(Object.keys(layers.a.materials!)).toEqual(['a:m']);
    expect(layers.a.overrides).toEqual({});
    expect(resolvedMaterials['silentgear:iron'].color).toBe('#FFFFFF');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/a\.jar.*antes.*silentgear:iron/);
  });
});
