/**
 * Gera os jars-sonda do spike #106 (ordem de camadas quando dois jars definem o mesmo
 * material em `silentgear_materials`). Cada jar tem só `META-INF/neoforge.mods.toml` e
 * `data/silentgear/silentgear_materials/order_probe.json`, sem código.
 *
 * Uso: npx tsx scripts/order-probe/generate.ts <pasta-de-saída>
 * Saída: <pasta>/run<N>/mods/*.jar e, na rodada 6, <pasta>/run6/kubegroovy/**.
 * Os jars não são versionados. Passo a passo das rodadas: scripts/order-probe/README.md.
 */
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';

export const MATERIAL_ID_FILE = 'order_probe.json';
export const MOD_LOADER = 'lowcodefml';
export const MINECRAFT_VERSION = '26.1.2';
export const SILENT_GEAR_VERSION = '4.2.3';

export type Ordering = 'AFTER' | 'BEFORE' | 'NONE';

export interface ProbeDependency {
  modId: string;
  ordering: Ordering;
}

export interface Probe {
  modId: string;
  fileName: string;
  /** Rótulo no nome do material, para a coluna Name do dump dizer qual sonda venceu. */
  label: string;
  /** Trait do material, distinto por sonda (a comparação do jogo também lê os traits). */
  trait: string;
  dependencies: ProbeDependency[];
  /** Ids de materiais do Silent Gear que a sonda sobrescreve (o jar do próprio Silent Gear também os define). */
  overrides?: string[];
}

export interface Run {
  run: number;
  description: string;
  probes: Probe[];
  /** Rodada 6: coloca o mesmo material em kubegroovy/dynamic_data. */
  kubegroovy?: boolean;
}

const IDENTITY = {
  aaa_probe: { label: 'Probe AAA', trait: 'silentgear:malleable' },
  zzz_probe: { label: 'Probe ZZZ', trait: 'silentgear:crushing' },
} as const;

const probe = (
  modId: keyof typeof IDENTITY,
  fileName: string,
  { dependencies = [], overrides = [] }: { dependencies?: ProbeDependency[]; overrides?: string[] } = {},
): Probe => ({ modId, fileName, ...IDENTITY[modId], dependencies, overrides });

export const RUNS: Run[] = [
  {
    run: 1,
    description: 'Sem dependência; nomes de arquivo na mesma ordem dos ids dos mods.',
    probes: [probe('aaa_probe', 'aaa-probe-1.0.0.jar'), probe('zzz_probe', 'zzz-probe-1.0.0.jar')],
  },
  {
    run: 2,
    description: 'Sem dependência; nomes de arquivo na ordem inversa dos ids dos mods.',
    probes: [probe('aaa_probe', 'zzz-probe-1.0.0.jar'), probe('zzz_probe', 'aaa-probe-1.0.0.jar')],
  },
  {
    run: 3,
    description: 'zzz_probe depende de aaa_probe com ordering AFTER.',
    probes: [
      probe('aaa_probe', 'aaa-probe-1.0.0.jar'),
      probe('zzz_probe', 'zzz-probe-1.0.0.jar', { dependencies: [{ modId: 'aaa_probe', ordering: 'AFTER' }] }),
    ],
  },
  {
    run: 4,
    description: 'zzz_probe depende de aaa_probe com ordering BEFORE (o inverso da rodada 3).',
    probes: [
      probe('aaa_probe', 'aaa-probe-1.0.0.jar'),
      probe('zzz_probe', 'zzz-probe-1.0.0.jar', { dependencies: [{ modId: 'aaa_probe', ordering: 'BEFORE' }] }),
    ],
  },
  {
    run: 5,
    description:
      'Como o sgearmetalworks: zzz_probe declara silentgear com ordering AFTER e sobrescreve silentgear:iron (que o jar do Silent Gear define); aaa_probe não declara nada.',
    probes: [
      probe('aaa_probe', 'aaa-probe-1.0.0.jar'),
      probe('zzz_probe', 'zzz-probe-1.0.0.jar', { dependencies: [{ modId: 'silentgear', ordering: 'AFTER' }], overrides: ['iron'] }),
    ],
  },
  {
    run: 6,
    description: 'Como a rodada 1, mais o mesmo material em kubegroovy/dynamic_data, publicado pelo script dynamic_data.groovy do ATM11 (instalar o jar do KubeGroovy e esse script).',
    probes: [probe('aaa_probe', 'aaa-probe-1.0.0.jar'), probe('zzz_probe', 'zzz-probe-1.0.0.jar')],
    kubegroovy: true,
  },
];

function modsToml(run: Run, p: Probe): string {
  const lines = [
    `modLoader="${MOD_LOADER}"`,
    'loaderVersion="[1,)"',
    'license="MIT"',
    '',
    '[[mods]]',
    `modId="${p.modId}"`,
    'version="1.0.0"',
    `displayName="Order probe ${p.label}"`,
    `description='''Sonda do spike #106 (rodada ${run.run}). Só dados, sem código.'''`,
  ];
  for (const dep of p.dependencies) {
    lines.push('', `[[dependencies.${p.modId}]]`, `modId="${dep.modId}"`, 'type="required"', 'versionRange="[0,)"', `ordering="${dep.ordering}"`, 'side="BOTH"');
  }
  return lines.join('\n') + '\n';
}

/** Baseado no iron.json do Silent Gear 4.2.3: o jogo rejeita o material sem `equippable` e `part_substitutes`. */
function materialJson(label: string, trait: string): string {
  return JSON.stringify(
    {
      type: 'silentgear:simple',
      parent: 'silentgear:empty',
      crafting: {
        can_salvage: true,
        categories: ['metal', 'intermediate'],
        gear_type_blacklist: [],
        ingredient: 'minecraft:stick',
        part_substitutes: { 'silentgear:rod': 'minecraft:stick' },
      },
      display: {
        color: '#FFFFFFFF',
        equippable: {
          always_use_tint: true,
          asset_id: 'silentgear:generic_shiny',
          compound_asset_id: 'silentgear:generic_shiny',
          equip_sound: 'minecraft:item.armor.equip_generic',
        },
        main_texture_type: 'HIGH_CONTRAST',
        name: { text: label },
        name_prefix: '',
      },
      properties: {
        'silentgear:main': {
          armor: 15.0,
          'armor/boots': 2.0,
          'armor/chestplate': 6.0,
          'armor/helmet': 2.0,
          'armor/leggings': 5.0,
          armor_durability: 15.0,
          attack_damage: 2.0,
          attack_speed: 0.0,
          charging_value: 0.7,
          draw_speed: 0.1,
          durability: 250.0,
          enchantment_value: 14.0,
          harvest_speed: 6.0,
          harvest_tier: { incorrect_blocks_for_tool: 'silentgear:incorrect_for_iron_tools', level_hint: '2', name: 'iron' },
          magic_armor: 6.0,
          magic_damage: 1.0,
          projectile_accuracy: 1.1,
          projectile_speed: 1.0,
          ranged_damage: 1.0,
          rarity: 20.0,
          traits: [{ conditions: [], level: 1, trait }],
        },
      },
    },
    null,
    2,
  );
}

export async function buildProbeJar(run: Run, p: Probe): Promise<Buffer> {
  const zip = new JSZip();
  // Data fixa: o mesmo jar sai com os mesmos bytes em cada geração.
  const date = new Date('2026-01-01T00:00:00Z');
  zip.file('META-INF/neoforge.mods.toml', modsToml(run, p), { date });
  zip.file(`data/silentgear/silentgear_materials/${MATERIAL_ID_FILE}`, materialJson(p.label, p.trait), { date });
  for (const id of p.overrides ?? []) {
    zip.file(`data/silentgear/silentgear_materials/${id}.json`, materialJson(`${p.label} ${id}`, p.trait), { date });
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/** Arquivos da rodada 6 dentro da pasta `kubegroovy/` da instância. */
export function kubegroovyFiles(): Record<string, string> {
  const rel = `silentgear/silentgear_materials/${MATERIAL_ID_FILE}`;
  return {
    'dynamic_data/index.json': JSON.stringify({ index: [rel] }, null, 2),
    [`dynamic_data/${rel}`]: materialJson('Probe KubeGroovy', 'silentgear:flexible'),
  };
}

/** Grava os arquivos da rodada 6 dentro de `<kubegroovyDir>/`. */
export function writeKubegroovy(kubegroovyDir: string): void {
  for (const [rel, content] of Object.entries(kubegroovyFiles())) {
    const target = path.join(kubegroovyDir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}

async function main(): Promise<void> {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error('Uso: npx tsx scripts/order-probe/generate.ts <pasta-de-saída>');
    process.exit(1);
  }
  for (const run of RUNS) {
    const modsDir = path.join(outDir, `run${run.run}`, 'mods');
    fs.mkdirSync(modsDir, { recursive: true });
    for (const p of run.probes) {
      fs.writeFileSync(path.join(modsDir, p.fileName), await buildProbeJar(run, p));
    }
    if (run.kubegroovy) writeKubegroovy(path.join(outDir, `run${run.run}`, 'kubegroovy'));
    console.log(`run${run.run}: ${run.description}`);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
