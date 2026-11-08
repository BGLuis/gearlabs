import { describe, it, expect } from 'vitest';
import {
  addonsStorageKey,
  parseStoredAddons,
  loadActiveAddons,
  saveActiveAddons,
  type AddonsStorage,
} from './addons-state';

function fakeStorage(initial: Record<string, string> = {}): AddonsStorage & { data: Map<string, string>; writes: string[] } {
  const data = new Map(Object.entries(initial));
  const writes: string[] = [];
  return {
    data,
    writes,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      writes.push(k);
      data.set(k, v);
    },
  };
}

const LEGACY = 'gearlabs_addons_atm11';
const V14 = 'gearlabs_addons_atm11@0.14.0-beta';
const V11 = 'gearlabs_addons_atm11@0.11.1-beta';

const target = { preset: 'atm11', pack: '0.14.0-beta', catalogFailed: false };

const base = {
  preset: 'atm11',
  pack: '0.14.0-beta',
  catalogAddonIds: ['a', 'b', 'new'],
  defaults: ['a'],
  knownVersions: ['0.14.0-beta', '0.11.1-beta'],
  catalogFailed: false,
};

describe('addonsStorageKey', () => {
  it('uses the versioned key for atm11 and the preset key for everything else', () => {
    expect(addonsStorageKey('atm11', '0.14.0-beta')).toBe(V14);
    expect(addonsStorageKey('1.21.1')).toBe('gearlabs_addons_1.21.1');
    expect(addonsStorageKey('custom_1', '9')).toBe('gearlabs_addons_custom_1');
  });
});

describe('parseStoredAddons', () => {
  it('returns the ids of a valid array, including the empty one', () => {
    expect(parseStoredAddons('["a","b"]')).toEqual(['a', 'b']);
    expect(parseStoredAddons('[]')).toEqual([]);
  });
  it('returns null for absent, broken or non-array values', () => {
    expect(parseStoredAddons(null)).toBeNull();
    expect(parseStoredAddons('{oops')).toBeNull();
    expect(parseStoredAddons('{"a":1}')).toBeNull();
    expect(parseStoredAddons('["a",3]')).toBeNull();
  });
});

describe('loadActiveAddons', () => {
  it('copies the legacy key to the new version, minus ids missing from the catalog, and leaves the legacy key alone', () => {
    const s = fakeStorage({ [LEGACY]: '["a","gone"]' });
    expect(loadActiveAddons(s, base)).toEqual(['a']);
    expect(s.data.get(V14)).toBe('["a"]');
    expect(s.data.get(LEGACY)).toBe('["a","gone"]');
    expect(s.writes).toEqual([V14]);
  });

  it('prefers the newest version with saved state over the frozen legacy key', () => {
    const s = fakeStorage({ [LEGACY]: '["a"]', [V11]: '["b"]' });
    expect(loadActiveAddons(s, base)).toEqual(['b']);
  });

  it('uses the highest version in the index order, not the last edited', () => {
    const s = fakeStorage({ [V11]: '["b"]', 'gearlabs_addons_atm11@0.13.0-beta': '["a"]' });
    const out = loadActiveAddons(s, { ...base, knownVersions: ['0.11.1-beta', '0.14.0-beta', '0.13.0-beta'] });
    expect(out).toEqual(['a']);
  });

  it('does not enable addons that only exist in the new catalog', () => {
    const s = fakeStorage({ [V11]: '["a"]' });
    expect(loadActiveAddons(s, { ...base, defaults: ['a', 'new'] })).toEqual(['a']);
  });

  it('uses the catalog defaults, without writing, when nothing is saved anywhere', () => {
    const s = fakeStorage();
    expect(loadActiveAddons(s, base)).toEqual(['a']);
    expect(s.writes).toEqual([]);
  });

  it('keeps what the player changed when the same version loads twice', () => {
    const s = fakeStorage({ [LEGACY]: '["a"]' });
    loadActiveAddons(s, base);
    saveActiveAddons(s, target, ['a', 'b']);
    expect(loadActiveAddons(s, base)).toEqual(['a', 'b']);
    expect(s.data.get(LEGACY)).toBe('["a"]');
  });

  it('reads an existing own state as is and treats [] as saved', () => {
    const s = fakeStorage({ [V14]: '["gone"]', [LEGACY]: '["a"]' });
    expect(loadActiveAddons(s, base)).toEqual(['gone']);
    const e = fakeStorage({ [V14]: '[]', [LEGACY]: '["a"]' });
    expect(loadActiveAddons(e, base)).toEqual([]);
    expect(e.writes).toEqual([]);
  });

  it('treats an invalid own value as absent and rewrites it', () => {
    const s = fakeStorage({ [V14]: '{oops', [LEGACY]: '["b"]' });
    expect(loadActiveAddons(s, base)).toEqual(['b']);
    expect(s.data.get(V14)).toBe('["b"]');
  });

  it('does not migrate or write when the catalog failed to load', () => {
    const s = fakeStorage({ [LEGACY]: '["a"]' });
    expect(loadActiveAddons(s, { ...base, catalogFailed: true })).toEqual(['a']);
    expect(s.writes).toEqual([]);
    expect(loadActiveAddons(fakeStorage(), { ...base, catalogFailed: true })).toEqual(['a']);
  });

  it('reads the legacy key and writes nothing when the pack version is unknown', () => {
    const s = fakeStorage({ [LEGACY]: '["b"]' });
    expect(loadActiveAddons(s, { ...base, pack: undefined, catalogFailed: true })).toEqual(['b']);
    expect(s.writes).toEqual([]);
  });

  it('keeps reading and writing gearlabs_addons_<preset> for presets without an index', () => {
    const s = fakeStorage({ 'gearlabs_addons_1.21.1': '["a","gone"]' });
    const opts = { ...base, preset: '1.21.1', pack: undefined, knownVersions: [] };
    expect(loadActiveAddons(s, opts)).toEqual(['a', 'gone']);
    expect(s.writes).toEqual([]);
    saveActiveAddons(s, { preset: '1.21.1', catalogFailed: false }, ['b']);
    expect(s.data.get('gearlabs_addons_1.21.1')).toBe('["b"]');
    expect(loadActiveAddons(fakeStorage(), opts)).toEqual(['a']);
  });
});

describe('saveActiveAddons', () => {
  it('writes only the key of the version being edited', () => {
    const s = fakeStorage({ [LEGACY]: '["a"]', [V11]: '["a"]' });
    saveActiveAddons(s, target, ['b']);
    expect(s.data.get(V14)).toBe('["b"]');
    expect(s.data.get(V11)).toBe('["a"]');
    expect(s.data.get(LEGACY)).toBe('["a"]');
  });

  it('does not write while the catalog is in fallback, so the real load can still migrate', () => {
    const s = fakeStorage({ [LEGACY]: '["a","gone"]' });
    saveActiveAddons(s, { ...target, catalogFailed: true }, ['a', 'gone', 'b']);
    expect(s.writes).toEqual([]);
    expect(loadActiveAddons(s, base)).toEqual(['a']);
  });

  it('never writes the legacy key when the pack version is unknown', () => {
    const s = fakeStorage();
    saveActiveAddons(s, { ...target, pack: undefined }, ['a']);
    expect(s.writes).toEqual([]);
  });
});
