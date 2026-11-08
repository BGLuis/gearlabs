import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import JSZip from 'jszip';
import { FIXTURE, tmpDirs } from './catalog-instance';

export interface SyntheticJar {
  /** nome do arquivo em mods/, independe do mod id */
  file: string;
  modId: string;
  /** relações de ordem declaradas no neoforge.mods.toml */
  after?: string[];
  before?: string[];
  /** caminho dentro do jar -> conteúdo JSON */
  files?: Record<string, unknown>;
}

export interface SyntheticInstance {
  jars: SyntheticJar[];
  /** caminho relativo a minecraft/ -> conteúdo JSON */
  scripts?: Record<string, unknown>;
  /** pastas vazias criadas em minecraft/ */
  emptyDirs?: string[];
}

export const material = (color = '#FF112233', traits: string[] = []) => ({
  crafting: { categories: ['metal'] },
  display: { color },
  stats: traits.length ? { main: { traits: traits.map((trait) => ({ trait, level: 1 })) } } : {},
});

export function modsToml(jar: Pick<SyntheticJar, 'modId' | 'after' | 'before'>): string {
  const dep = (modId: string, ordering: string) =>
    `[[dependencies.${jar.modId}]]\nmodId="${modId}"\ntype="optional"\nordering="${ordering}"\nside="BOTH"\n`;
  return [
    'modLoader="javafml"',
    '[[mods]]',
    `modId="${jar.modId}"`,
    'version="26.1.2-1.0.0"',
    `displayName="${jar.modId} display"`,
    '[[dependencies.' + jar.modId + ']]\nmodId="neoforge"\ntype="required"\nordering="NONE"\nside="BOTH"\n',
    ...(jar.after ?? []).map((m) => dep(m, 'AFTER')),
    ...(jar.before ?? []).map((m) => dep(m, 'BEFORE')),
  ].join('\n');
}

export async function buildSyntheticInstance(spec: SyntheticInstance): Promise<string> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'synthetic-instance-'));
  tmpDirs.push(root);
  fs.cpSync(path.join(FIXTURE, 'flame'), path.join(root, 'flame'), { recursive: true });
  fs.cpSync(path.join(FIXTURE, 'instance.cfg'), path.join(root, 'instance.cfg'));
  const mc = path.join(root, 'minecraft');
  fs.mkdirSync(path.join(mc, 'mods'), { recursive: true });
  for (const jar of spec.jars) {
    const zip = new JSZip();
    zip.file('META-INF/neoforge.mods.toml', modsToml(jar), { date: new Date(0) });
    for (const [rel, json] of Object.entries(jar.files ?? {})) {
      zip.file(rel, JSON.stringify(json), { date: new Date(0) });
    }
    fs.writeFileSync(path.join(mc, 'mods', jar.file), await zip.generateAsync({ type: 'nodebuffer' }));
  }
  for (const [rel, json] of Object.entries(spec.scripts ?? {})) {
    fs.mkdirSync(path.dirname(path.join(mc, rel)), { recursive: true });
    fs.writeFileSync(path.join(mc, rel), JSON.stringify(json));
  }
  for (const dir of spec.emptyDirs ?? []) fs.mkdirSync(path.join(mc, dir), { recursive: true });
  return root;
}
