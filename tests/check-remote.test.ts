import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createHash } from 'crypto';
import type { CatalogSource } from '../src/types/silentgear';
import {
  compareRemote,
  checkInactivity,
  diffHash,
  formatReport,
  loadLatestSource,
  parseModlist,
  README_SECTION,
  type RemoteState,
} from '../scripts/check-remote';

const FIX = path.join(__dirname, 'fixtures/check-remote');
const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');

const MATERIAL_PATH = 'kubegroovy/dynamic_data/silentgear/silentgear_materials/allthemodium.json';
const MATERIAL_BODY = '{"type":"silentgear:basic"}';

function baseSource(): CatalogSource {
  const source = JSON.parse(fs.readFileSync(path.join(FIX, 'catalog-source.json'), 'utf8')) as CatalogSource;
  source.files.find((f) => f.kind === 'script-data')!.sha1 = sha1(MATERIAL_BODY);
  return source;
}

function baseRemote(): RemoteState {
  return {
    commit: '605d006552a830b0738f864108f6d6421ec4095b',
    modlist: parseModlist(fs.readFileSync(path.join(FIX, 'modlist.json'), 'utf8')),
    scripts: { [MATERIAL_PATH]: sha1(MATERIAL_BODY) },
  };
}

describe('check-remote (#99)', () => {
  it('reports no changes for a BOM modlist matching the catalog source', () => {
    expect(fs.readFileSync(path.join(FIX, 'modlist.json')).subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(compareRemote(baseSource(), baseRemote())).toEqual([]);
  });

  it('names the jar and both versions when the Silent Gear jar changes version', () => {
    const remote = baseRemote();
    const entry = remote.modlist['silent-gear-26.1.2-neoforge-4.2.3.jar'];
    delete remote.modlist['silent-gear-26.1.2-neoforge-4.2.3.jar'];
    remote.modlist['silent-gear-26.1.2-neoforge-4.2.4.jar'] = {
      ...entry,
      jarName: 'silent-gear-26.1.2-neoforge-4.2.4.jar',
      version: '4.2.4',
    };
    const diffs = compareRemote(baseSource(), remote);
    expect(diffs).toHaveLength(1);
    const text = formatReport(diffs, remote.commit, '0.14.0-beta');
    expect(text).toContain('silent-gear-26.1.2-neoforge-4.2.3.jar');
    expect(text).toContain('silent-gear-26.1.2-neoforge-4.2.4.jar');
    expect(text).toContain('4.2.3');
    expect(text).toContain('4.2.4');
  });

  it('names the jar when the sha1 changes under the same file name', () => {
    const remote = baseRemote();
    remote.modlist['sgearmetalworks-26.1.2-1.6.0.jar'].modrinthHash = 'f'.repeat(40);
    const diffs = compareRemote(baseSource(), remote);
    expect(diffs).toHaveLength(1);
    expect(formatReport(diffs, remote.commit, '0.14.0-beta')).toContain('sgearmetalworks-26.1.2-1.6.0.jar');
  });

  it('reports a jar from the source that left the modlist', () => {
    const remote = baseRemote();
    delete remote.modlist['allthemodium-26.1.2-4.2.0.jar'];
    const diffs = compareRemote(baseSource(), remote);
    expect(diffs).toEqual([expect.objectContaining({ kind: 'jar-removed' })]);
  });

  it('ignores changes and additions of jars unrelated to Silent Gear', () => {
    const remote = baseRemote();
    remote.modlist['AdvancedAE-26.1.7.jar'].modrinthHash = '2'.repeat(40);
    remote.modlist['NewMod-1.0.jar'] = { jarName: 'NewMod-1.0.jar', modId: 'newmod', version: '1.0', modrinthHash: '3'.repeat(40) };
    expect(compareRemote(baseSource(), remote)).toEqual([]);
  });

  it('names the file when a silentgear_materials script has a different sha1', () => {
    const remote = baseRemote();
    remote.scripts[MATERIAL_PATH] = sha1('{"changed":true}');
    const diffs = compareRemote(baseSource(), remote);
    expect(diffs).toHaveLength(1);
    expect(formatReport(diffs, remote.commit, '0.14.0-beta')).toContain(MATERIAL_PATH);
  });

  it('reports new and removed silentgear scripts', () => {
    const remote = baseRemote();
    const added = 'kubegroovy/dynamic_data/silentgear/silentgear_traits/new_trait.json';
    remote.scripts[added] = sha1('x');
    expect(compareRemote(baseSource(), remote)).toEqual([expect.objectContaining({ kind: 'script-added', path: added })]);

    const gone = baseRemote();
    gone.scripts = {};
    expect(compareRemote(baseSource(), gone)).toEqual([expect.objectContaining({ kind: 'script-removed', path: MATERIAL_PATH })]);
  });

  it('gives the same hash for the same differences and another for different ones', () => {
    const a = baseRemote();
    a.scripts[MATERIAL_PATH] = sha1('v2');
    const b = baseRemote();
    b.scripts[MATERIAL_PATH] = sha1('v3');
    const da = compareRemote(baseSource(), a);
    expect(diffHash(da)).toBe(diffHash(compareRemote(baseSource(), a)));
    expect(diffHash(da)).not.toBe(diffHash(compareRemote(baseSource(), b)));
  });

  describe('inactivity', () => {
    it('fails after 50 days without a commit and points to the README section', () => {
      const result = checkInactivity(new Date('2026-08-01T00:00:00Z'), new Date('2026-10-01T00:00:00Z'));
      expect(result).toContain(README_SECTION);
      expect(result).toContain('61');
    });

    it('passes within 50 days', () => {
      expect(checkInactivity(new Date('2026-08-20T00:00:00Z'), new Date('2026-10-01T00:00:00Z'))).toBeNull();
    });
  });

  describe('latest catalog', () => {
    const dirs: string[] = [];
    afterEach(() => {
      while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
    });

    function publish(withSource: boolean): string {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-remote-'));
      dirs.push(dir);
      fs.mkdirSync(path.join(dir, '0.14.0-beta'));
      fs.writeFileSync(
        path.join(dir, 'index.json'),
        JSON.stringify({ latest: '0.14.0-beta', versions: [{ id: '0.14.0-beta', folder: '0.14.0-beta', minecraft: '26.1.2', sha1: 'x' }] })
      );
      fs.writeFileSync(
        path.join(dir, '0.14.0-beta/catalog.json'),
        JSON.stringify({ version: 'atm11', ...(withSource && { source: baseSource() }) })
      );
      return dir;
    }

    it('reads the source of the version named by index.latest', () => {
      const { id, source } = loadLatestSource(publish(true));
      expect(id).toBe('0.14.0-beta');
      expect(source.pack.version).toBe('0.14.0-beta');
    });

    it('fails visibly when the latest catalog has no source', () => {
      expect(() => loadLatestSource(publish(false))).toThrow(/sem source.*#98/);
    });
  });
});
