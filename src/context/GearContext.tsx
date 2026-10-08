'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GearBuild,
  CalculatedGearStats,
  VersionCatalog,
  VersionPreset,
  Grade,
  PartSlot,
  SubMaterialSelection,
  StarchargeLevel,
} from '@/types/silentgear';
import {
  ATM11_CATALOG,
  VERSION_PRESETS,
  OFFICIAL_GEAR_TYPES,
  OFFICIAL_TRAITS,
} from '@/data/defaultCatalog';
import { calculateGearStats } from '@/lib/calculator';
import { decodeBuildFromHash, encodeBuildToHash } from '@/lib/url-state';

interface GearContextType {
  version: string;
  setVersion: (v: string) => void;
  presets: VersionPreset[];
  catalog: VersionCatalog;
  build: GearBuild;
  stats: CalculatedGearStats;
  setGearType: (typeId: string) => void;
  setPartMaterial: (slot: PartSlot, materialId: string, grade?: Grade, starcharge?: StarchargeLevel) => void;
  setPartSubMaterials: (slot: PartSlot, materials: SubMaterialSelection[]) => void;
  addSubMaterial: (slot: PartSlot, materialId: string, grade?: Grade) => void;
  removeSubMaterial: (slot: PartSlot, index: number) => void;
  reorderSubMaterials: (slot: PartSlot, fromIndex: number, toIndex: number) => void;
  updateSubMaterial: (slot: PartSlot, index: number, materialId: string, grade?: Grade) => void;
  setPartStarcharge: (slot: PartSlot, starcharge: StarchargeLevel) => void;
  removePart: (slot: PartSlot) => void;
  loadBuild: (newBuild: GearBuild) => void;
  inventory: Set<string>;
  toggleInventoryMaterial: (materialId: string) => void;
  setAllInventory: (enableAll: boolean) => void;
  importCustomCatalog: (name: string, customCatalog: VersionCatalog) => void;
  lang: 'pt' | 'en';
  setLang: (l: 'pt' | 'en') => void;
  shareUrl: string;
  copyShareUrl: () => Promise<boolean>;
}

const initialBuild: GearBuild = {
  gearTypeId: 'sword',
  parts: {
    main: { materialId: 'silentgear:unobtainium', grade: 'NONE' },
    rod: { materialId: 'silentgear:breeze_rod', grade: 'NONE' },
  },
};

const GearContext = createContext<GearContextType | null>(null);

export function GearProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersionState] = useState<string>('atm11');
  const [presets, setPresets] = useState<VersionPreset[]>(VERSION_PRESETS);
  const [catalog, setCatalog] = useState<VersionCatalog>(ATM11_CATALOG);
  const [customCatalogs, setCustomCatalogs] = useState<Record<string, VersionCatalog>>({});
  const [build, setBuild] = useState<GearBuild>(initialBuild);
  const [inventory, setInventory] = useState<Set<string>>(
    new Set(Object.keys(ATM11_CATALOG.materials))
  );
  const [lang, setLangState] = useState<'pt' | 'en'>('pt');
  const [shareUrl, setShareUrl] = useState<string>('');

  // Carregar dados salvos no localStorage e hash da URL ao montar
  useEffect(() => {
    // 1. Idioma
    const savedLang = localStorage.getItem('gearlabs_lang') as 'pt' | 'en';
    if (savedLang === 'pt' || savedLang === 'en') {
      setLangState(savedLang);
    }

    // 2. Modpacks customizados salvos
    const savedCustom = localStorage.getItem('gearlabs_custom_catalogs');
    if (savedCustom) {
      try {
        const parsed = JSON.parse(savedCustom);
        setCustomCatalogs(parsed);
        const customPresets: VersionPreset[] = Object.keys(parsed).map((id) => ({
          id,
          name: parsed[id].name || id,
          badge: 'Custom',
          type: 'custom',
          minecraftVersion: 'Custom',
          description: 'Modpack importado pelo usuário',
        }));
        setPresets([...VERSION_PRESETS, ...customPresets]);
      } catch (e) {
        console.error('Failed to parse custom catalogs', e);
      }
    }

    // 3. Inventário
    const savedInv = localStorage.getItem('gearlabs_inventory');
    if (savedInv) {
      try {
        const parsed = JSON.parse(savedInv);
        if (Array.isArray(parsed)) {
          setInventory(new Set(parsed));
        }
      } catch (e) {
        console.error('Failed to parse saved inventory', e);
      }
    }

    // 4. Hash da URL (Link compartilhado)
    if (typeof window !== 'undefined' && window.location.hash) {
      const decoded = decodeBuildFromHash(window.location.hash);
      if (decoded) {
        setVersionState(decoded.version);
        setBuild(decoded.build);
      }
    }
  }, []);

  // Carregar catálogo da versão selecionada
  useEffect(() => {
    // Se for customizado
    if (customCatalogs[version]) {
      setCatalog(customCatalogs[version]);
      setInventory(new Set(Object.keys(customCatalogs[version].materials)));
      return;
    }

    // Buscar do endpoint estático
    async function loadCatalog() {
      try {
        const res = await fetch(`/data/versions/${version}/catalog.json`);
        if (res.ok) {
          const data = await res.json();
          setCatalog(data);
          setInventory(new Set(Object.keys(data.materials)));
          return;
        }
      } catch (err) {
        console.warn('Fallback to ATM11 catalog for version', version);
      }
      setCatalog(ATM11_CATALOG);
    }
    loadCatalog();
  }, [version, customCatalogs]);

  // Atualizar URL de compartilhamento sempre que a build muda
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = encodeBuildToHash(build, version);
      const url = `${window.location.origin}${window.location.pathname}#${hash}`;
      setShareUrl(url);
      window.history.replaceState(null, '', `#${hash}`);
    }
  }, [build, version]);

  const stats = React.useMemo(() => {
    try {
      return calculateGearStats(build, catalog);
    } catch (e) {
      return {
        durability: 100,
        armor: 0,
        armorToughness: 0,
        magicArmor: 0,
        meleeDamage: 1,
        attackSpeed: 1,
        dps: 1,
        harvestSpeed: 1,
        harvestTier: 'minecraft:wood',
        synergy: 100,
        rarity: 0,
        traits: [],
      };
    }
  }, [build, catalog]);

  function setVersion(newV: string) {
    setVersionState(newV);
  }

  function setLang(newLang: 'pt' | 'en') {
    setLangState(newLang);
    localStorage.setItem('gearlabs_lang', newLang);
  }

  function setGearType(typeId: string) {
    const gearType = catalog.gearTypes[typeId];
    if (!gearType) return;
    const newParts: Partial<Record<PartSlot, { materialId: string; grade?: Grade }>> = {};

    for (const slot of gearType.requiredSlots) {
      if (build.parts[slot] && catalog.materials[build.parts[slot]!.materialId]) {
        newParts[slot] = build.parts[slot];
      } else {
        const firstAvailable = Object.keys(catalog.materials)[0] || 'silentgear:unobtainium';
        newParts[slot] = { materialId: firstAvailable, grade: 'NONE' };
      }
    }
    setBuild({ gearTypeId: typeId, parts: newParts });
  }

  function setPartMaterial(slot: PartSlot, materialId: string, grade?: Grade, starcharge?: StarchargeLevel) {
    setBuild((prev) => ({
      ...prev,
      parts: {
        ...prev.parts,
        [slot]: {
          materialId,
          grade: grade !== undefined ? grade : (prev.parts[slot]?.grade || 'NONE'),
          starcharge: starcharge !== undefined ? starcharge : (prev.parts[slot]?.starcharge || 0),
          materials: undefined,
        },
      },
    }));
  }

  function setPartSubMaterials(slot: PartSlot, materials: SubMaterialSelection[]) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      const primary = materials[0];
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: {
            materialId: primary?.materialId || current?.materialId || '',
            grade: current?.grade || primary?.grade || 'NONE',
            starcharge: current?.starcharge || 0,
            materials,
          },
        },
      };
    });
  }

  function addSubMaterial(slot: PartSlot, materialId: string, grade: Grade = 'NONE') {
    setBuild((prev) => {
      const current = prev.parts[slot];
      const currentMaterials = current?.materials && current.materials.length > 0
        ? [...current.materials]
        : (current?.materialId ? [{ materialId: current.materialId, grade: current.grade || 'NONE' }] : []);

      if (currentMaterials.length >= 6) return prev;

      const newMaterials = [...currentMaterials, { materialId, grade }];
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: {
            materialId: newMaterials[0].materialId,
            grade: current?.grade || newMaterials[0].grade || 'NONE',
            materials: newMaterials,
          },
        },
      };
    });
  }

  function removeSubMaterial(slot: PartSlot, index: number) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      if (!current?.materials || current.materials.length <= index) return prev;
      const nextMaterials = current.materials.filter((_, i) => i !== index);
      if (nextMaterials.length === 0) {
        const nextParts = { ...prev.parts };
        delete nextParts[slot];
        return { ...prev, parts: nextParts };
      }
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: {
            materialId: nextMaterials[0].materialId,
            grade: current.grade || nextMaterials[0].grade || 'NONE',
            materials: nextMaterials.length > 1 ? nextMaterials : undefined,
          },
        },
      };
    });
  }

  function reorderSubMaterials(slot: PartSlot, fromIndex: number, toIndex: number) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      if (!current?.materials || fromIndex === toIndex) return prev;
      if (
        fromIndex < 0 ||
        fromIndex >= current.materials.length ||
        toIndex < 0 ||
        toIndex >= current.materials.length
      ) {
        return prev;
      }

      const nextMaterials = [...current.materials];
      const [moved] = nextMaterials.splice(fromIndex, 1);
      nextMaterials.splice(toIndex, 0, moved);
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: {
            ...current,
            materialId: nextMaterials[0].materialId,
            materials: nextMaterials,
          },
        },
      };
    });
  }

  function updateSubMaterial(slot: PartSlot, index: number, materialId: string, grade?: Grade) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      if (!current?.materials || index < 0 || index >= current.materials.length) return prev;
      const nextMaterials = [...current.materials];
      nextMaterials[index] = {
        materialId,
        grade: grade !== undefined ? grade : nextMaterials[index].grade,
      };
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: {
            ...current,
            materialId: nextMaterials[0].materialId,
            materials: nextMaterials,
          },
        },
      };
    });
  }

  function setPartStarcharge(slot: PartSlot, starcharge: StarchargeLevel) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      if (!current) return prev;
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: {
            ...current,
            starcharge,
          },
        },
      };
    });
  }

  function removePart(slot: PartSlot) {
    setBuild((prev) => {
      const nextParts = { ...prev.parts };
      delete nextParts[slot];
      return { ...prev, parts: nextParts };
    });
  }

  function loadBuild(newBuild: GearBuild) {
    setBuild(newBuild);
  }

  function toggleInventoryMaterial(materialId: string) {
    setInventory((prev) => {
      const next = new Set(prev);
      if (next.has(materialId)) {
        next.delete(materialId);
      } else {
        next.add(materialId);
      }
      localStorage.setItem('gearlabs_inventory', JSON.stringify(Array.from(next)));
      return next;
    });
  }

  function setAllInventory(enableAll: boolean) {
    const next = enableAll ? new Set(Object.keys(catalog.materials)) : new Set<string>();
    setInventory(next);
    localStorage.setItem('gearlabs_inventory', JSON.stringify(Array.from(next)));
  }

  function importCustomCatalog(name: string, customCatalog: VersionCatalog) {
    const customId = `custom_${Date.now()}`;
    const nextCatalogs = {
      ...customCatalogs,
      [customId]: {
        ...customCatalog,
        version: customId,
      },
    };
    setCustomCatalogs(nextCatalogs);
    localStorage.setItem('gearlabs_custom_catalogs', JSON.stringify(nextCatalogs));

    const newPreset: VersionPreset = {
      id: customId,
      name,
      badge: 'Custom',
      type: 'custom',
      minecraftVersion: 'Custom',
      description: 'Modpack importado via .zip ou dump',
    };
    setPresets((prev) => [...prev, newPreset]);
    setVersionState(customId);
  }

  async function copyShareUrl(): Promise<boolean> {
    try {
      if (navigator.clipboard && shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        return true;
      }
    } catch (e) {
      console.error('Failed to copy share url', e);
    }
    return false;
  }

  return (
    <GearContext.Provider
      value={{
        version,
        setVersion,
        presets,
        catalog,
        build,
        stats,
        setGearType,
        setPartMaterial,
        setPartSubMaterials,
        addSubMaterial,
        removeSubMaterial,
        reorderSubMaterials,
        updateSubMaterial,
        setPartStarcharge,
        removePart,
        loadBuild,
        inventory,
        toggleInventoryMaterial,
        setAllInventory,
        importCustomCatalog,
        lang,
        setLang,
        shareUrl,
        copyShareUrl,
      }}
    >
      {children}
    </GearContext.Provider>
  );
}

export function useGear() {
  const ctx = useContext(GearContext);
  if (!ctx) {
    throw new Error('useGear must be used within a GearProvider');
  }
  return ctx;
}
