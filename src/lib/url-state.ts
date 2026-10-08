import LZString from 'lz-string';
import { GearBuild, PartSlot, Grade, GearPartSelection, SubMaterialSelection } from '@/types/silentgear';

interface SerializedPartState {
  m?: string;
  g?: Grade;
  mats?: { m: string; g?: Grade }[];
}

interface SerializedBuildState {
  v: string; // versão (ex: "1.20.1")
  t: string; // tipo de item (ex: "sword")
  p: Record<string, SerializedPartState>; // partes
}

export function encodeBuildToHash(build: GearBuild, version: string): string {
  const parts: Record<string, SerializedPartState> = {};
  for (const [slot, sel] of Object.entries(build.parts)) {
    if (sel && (sel.materialId || (sel.materials && sel.materials.length > 0))) {
      const partData: SerializedPartState = {
        m: sel.materialId,
        ...(sel.grade && sel.grade !== 'NONE' ? { g: sel.grade } : {}),
      };
      if (sel.materials && sel.materials.length > 0) {
        partData.mats = sel.materials.map((sub) => ({
          m: sub.materialId,
          ...(sub.grade && sub.grade !== 'NONE' ? { g: sub.grade } : {}),
        }));
      }
      parts[slot] = partData;
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

    const parts: Partial<Record<PartSlot, GearPartSelection>> = {};
    for (const [slot, data] of Object.entries(parsed.p)) {
      if (data) {
        const primaryId = data.m || data.mats?.[0]?.m || '';
        const primaryGrade = data.g || data.mats?.[0]?.g || 'NONE';
        const materials: SubMaterialSelection[] | undefined =
          data.mats && data.mats.length > 0
            ? data.mats.map((sub) => ({
                materialId: sub.m,
                grade: sub.g || 'NONE',
              }))
            : undefined;

        if (primaryId) {
          parts[slot as PartSlot] = {
            materialId: primaryId,
            grade: primaryGrade,
            ...(materials ? { materials } : {}),
          };
        }
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
