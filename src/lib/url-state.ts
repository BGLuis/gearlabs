import LZString from 'lz-string';
import { GearBuild, PartSlot, Grade } from '@/types/silentgear';

interface SerializedBuildState {
  v: string; // versão (ex: "1.20.1")
  t: string; // tipo de item (ex: "sword")
  p: Record<string, { m: string; g?: Grade }>; // partes
}

export function encodeBuildToHash(build: GearBuild, version: string): string {
  const parts: Record<string, { m: string; g?: Grade }> = {};
  for (const [slot, sel] of Object.entries(build.parts)) {
    if (sel && sel.materialId) {
      parts[slot] = {
        m: sel.materialId,
        ...(sel.grade && sel.grade !== 'NONE' ? { g: sel.grade } : {}),
      };
    }
  }

  const payload: SerializedBuildState = {
    v: version,
    t: build.gearTypeId,
    p: parts,
  };

  const json = JSON.stringify(payload);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeBuildFromHash(
  hash: string
): { build: GearBuild; version: string } | null {
  try {
    if (!hash || hash.trim() === '') return null;
    const cleanHash = hash.replace(/^#/, '');
    const json = LZString.decompressFromEncodedURIComponent(cleanHash);
    if (!json) return null;

    const parsed: SerializedBuildState = JSON.parse(json);
    if (!parsed.t || !parsed.p) return null;

    const parts: Partial<Record<PartSlot, { materialId: string; grade?: Grade }>> = {};
    for (const [slot, data] of Object.entries(parsed.p)) {
      if (data && data.m) {
        parts[slot as PartSlot] = {
          materialId: data.m,
          grade: data.g || 'NONE',
        };
      }
    }

    return {
      version: parsed.v || '1.20.1',
      build: {
        gearTypeId: parsed.t,
        parts,
      },
    };
  } catch (err) {
    console.error('Failed to decode build hash:', err);
    return null;
  }
}
