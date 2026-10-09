import LZString from 'lz-string';
import {
  GearBuild,
  PartSlot,
  Grade,
  GearPartSelection,
  SubMaterialSelection,
  StarchargeLevel,
  AlloyType,
  PartMaterialInstance,
} from '@/types/silentgear';
import { getPartInstanceCount, syncPartInstancesWithCount } from './parts';

interface SerializedInstance {
  g?: Grade;
  s?: StarchargeLevel;
  m?: string;
  a?: AlloyType;
  mats?: { m: string }[];
}

interface SerializedPartState {
  m?: string;
  g?: Grade;
  s?: StarchargeLevel;
  a?: AlloyType;
  mats?: { m: string; g?: Grade }[];
  inst?: SerializedInstance[];
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
        ...(sel.starcharge && sel.starcharge > 0 ? { s: sel.starcharge } : {}),
        ...(sel.alloyType ? { a: sel.alloyType } : {}),
      };
      if (sel.materials && sel.materials.length > 0) {
        partData.mats = sel.materials.map((sub) => ({
          m: sub.materialId,
        }));
      }

      // Se houver instâncias heterogêneas, serializa instâncias (Issue #33)
      if (sel.instances && sel.instances.length > 1) {
        const defaultMatsKey = sel.materials ? JSON.stringify(sel.materials) : '';
        const hasHeterogeneous = sel.instances.some(
          (inst) =>
            (inst.grade && inst.grade !== (sel.grade || 'NONE')) ||
            (inst.starcharge !== undefined && inst.starcharge !== (sel.starcharge || 0)) ||
            (inst.materialId && inst.materialId !== sel.materialId) ||
            (inst.alloyType && inst.alloyType !== sel.alloyType) ||
            (inst.materials && JSON.stringify(inst.materials) !== defaultMatsKey)
        );
        if (hasHeterogeneous) {
          partData.inst = sel.instances.map((i) => ({
            ...(i.grade && i.grade !== 'NONE' ? { g: i.grade } : {}),
            ...(i.starcharge && i.starcharge > 0 ? { s: i.starcharge } : {}),
            ...(i.materialId && i.materialId !== sel.materialId ? { m: i.materialId } : {}),
            ...(i.alloyType ? { a: i.alloyType } : {}),
            ...(i.materials ? { mats: i.materials.map((sm) => ({ m: sm.materialId })) } : {}),
          }));
        }
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
        const primaryGrade = data.g || 'NONE';
        const materials: SubMaterialSelection[] | undefined =
          data.mats && data.mats.length > 0
            ? data.mats.map((sub) => ({
                materialId: sub.m,
              }))
            : undefined;

        if (primaryId) {
          let instances: PartMaterialInstance[] | undefined;
          const count = getPartInstanceCount(parsed.t, slot as PartSlot);
          if (data.inst && data.inst.length > 0) {
            const decodedInst: PartMaterialInstance[] = data.inst.map((i) => ({
              grade: i.g || 'NONE',
              ...(i.s && i.s > 0 ? { starcharge: i.s } : {}),
              ...(i.m ? { materialId: i.m } : {}),
              ...(i.a ? { alloyType: i.a } : {}),
              ...(i.mats ? { materials: i.mats.map((sm) => ({ materialId: sm.m })) } : {}),
            }));
            instances = syncPartInstancesWithCount(
              { materialId: primaryId, grade: primaryGrade, starcharge: data.s || 0, instances: decodedInst },
              count
            );
          } else {
            // Critério 2 (Issue #33): Builds de URL antigas carregam como lista de uma instância repetida
            instances = [];
            for (let i = 0; i < count; i++) {
              instances.push({
                grade: primaryGrade,
                ...(data.s && data.s > 0 ? { starcharge: data.s } : {}),
              });
            }
          }

          parts[slot as PartSlot] = {
            materialId: primaryId,
            grade: primaryGrade,
            ...(materials ? { materials } : {}),
            ...(data.s && data.s > 0 ? { starcharge: data.s } : {}),
            ...(data.a
              ? { alloyType: data.a }
              : materials && materials.length > 0
              ? { alloyType: 'metal' }
              : {}),
            ...(instances ? { instances } : {}),
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
