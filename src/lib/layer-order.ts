/**
 * Ordem de carga das camadas de dados do Silent Gear (#93), medida no jogo pelo #106:
 * o último pacote carregado vence; os jars carregam em ordem topológica do `ordering`
 * (AFTER/BEFORE) declarado no `neoforge.mods.toml`, contando só mods presentes e
 * ignorando neoforge e minecraft; sem relação entre dois mods, o id maior carrega
 * depois; o nome do arquivo não conta; as raízes de script (kubegroovy, kubejs)
 * carregam depois de todos os jars. Este é o único ponto que codifica a regra.
 */

export interface ModOrdering {
  modId: string;
  /** ids dos mods de que este mod declara `ordering="AFTER"` (carrega depois deles) */
  after: string[];
  /** ids dos mods de que este mod declara `ordering="BEFORE"` (carrega antes deles) */
  before: string[];
}

export interface ParsedModsToml extends ModOrdering {
  version?: string;
  displayName?: string;
}

interface RawDependency {
  owner: string;
  modId?: string;
  ordering?: string;
}

const IGNORED_ORDERING_TARGETS = new Set(['neoforge', 'minecraft']);

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function tomlString(line: string, key: string): string | undefined {
  return line.match(new RegExp(`^${key}\\s*=\\s*(["'])(.*?)\\1`))?.[2];
}

/** Lê o primeiro `[[mods]]` e as dependências `[[dependencies.<modId>]]` dele. */
export function parseModsToml(toml: string): ParsedModsToml | undefined {
  let mod: ParsedModsToml | undefined;
  let inMods = false;
  let dep: RawDependency | undefined;
  const deps: RawDependency[] = [];

  for (const raw of toml.split(/\r?\n/)) {
    const line = raw.trim();
    const header = line.match(/^\[\[\s*([^\]]+?)\s*\]\]/);
    if (header) {
      inMods = header[1] === 'mods' && !mod;
      dep = undefined;
      if (inMods) mod = { modId: '', after: [], before: [] };
      else if (header[1].startsWith('dependencies.')) {
        dep = { owner: header[1].slice('dependencies.'.length) };
        deps.push(dep);
      }
      continue;
    }
    if (line.startsWith('[')) {
      inMods = false;
      dep = undefined;
      continue;
    }
    if (inMods && mod) {
      mod.modId = tomlString(line, 'modId') ?? mod.modId;
      mod.version = tomlString(line, 'version') ?? mod.version;
      mod.displayName = tomlString(line, 'displayName') ?? mod.displayName;
    } else if (dep) {
      dep.modId = tomlString(line, 'modId') ?? dep.modId;
      dep.ordering = tomlString(line, 'ordering') ?? dep.ordering;
    }
  }

  if (!mod || !mod.modId) return undefined;
  for (const d of deps) {
    if (d.owner !== mod.modId || !d.modId) continue;
    const ordering = d.ordering?.toUpperCase();
    if (ordering === 'AFTER') mod.after.push(d.modId);
    else if (ordering === 'BEFORE') mod.before.push(d.modId);
  }
  return mod;
}

export interface LoadSlot {
  id: string;
  kind: 'jar' | 'script';
}

/**
 * Pacotes em ordem de carga (o último vence), jars primeiro e depois as raízes de script.
 * O mod KubeGroovy tem o mesmo id da raiz de script `kubegroovy`: por isso o tipo no resultado.
 */
export function deriveLayerOrder(jars: ModOrdering[], scriptRoots: string[]): LoadSlot[] {
  const present = new Set<string>();
  for (const jar of jars) {
    if (present.has(jar.modId)) throw new Error(`[layer-order] mod id duplicado: ${jar.modId}`);
    present.add(jar.modId);
  }

  // aresta x -> y: x carrega antes de y
  const successors = new Map<string, Set<string>>(jars.map((j) => [j.modId, new Set<string>()]));
  const pending = new Map<string, number>(jars.map((j) => [j.modId, 0]));
  const link = (first: string, second: string) => {
    if (first === second || !present.has(first) || !present.has(second)) return;
    if (successors.get(first)!.has(second)) return;
    successors.get(first)!.add(second);
    pending.set(second, pending.get(second)! + 1);
  };
  for (const jar of jars) {
    for (const dep of jar.after) if (!IGNORED_ORDERING_TARGETS.has(dep)) link(dep, jar.modId);
    for (const dep of jar.before) if (!IGNORED_ORDERING_TARGETS.has(dep)) link(jar.modId, dep);
  }

  const order: string[] = [];
  const ready = [...pending].filter(([, n]) => n === 0).map(([id]) => id);
  while (ready.length) {
    ready.sort(byId);
    const next = ready.shift()!;
    order.push(next);
    for (const succ of successors.get(next)!) {
      const left = pending.get(succ)! - 1;
      pending.set(succ, left);
      if (left === 0) ready.push(succ);
    }
  }

  if (order.length < jars.length) {
    const stuck = new Set(jars.map((j) => j.modId).filter((id) => !order.includes(id)));
    // tira os mods que só dependem do ciclo, sem fazer parte dele
    for (let changed = true; changed; ) {
      changed = false;
      for (const id of [...stuck]) {
        if (![...successors.get(id)!].some((s) => stuck.has(s))) {
          stuck.delete(id);
          changed = true;
        }
      }
    }
    throw new Error(`[layer-order] ciclo na ordem de carga dos mods: ${[...stuck].sort(byId).join(', ')}`);
  }

  return [
    ...order.map((id): LoadSlot => ({ id, kind: 'jar' })),
    ...[...scriptRoots].sort(byId).map((id): LoadSlot => ({ id, kind: 'script' })),
  ];
}
