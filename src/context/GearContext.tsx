'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GearBuild,
  CalculatedGearStats,
  VersionCatalog,
  Grade,
  PartSlot,
} from '@/types/silentgear';
import {
  OFFICIAL_MATERIALS_1_20,
  OFFICIAL_GEAR_TYPES,
  OFFICIAL_TRAITS,
} from '@/data/defaultCatalog';
import { calculateGearStats } from '@/lib/calculator';
import { decodeBuildFromHash, encodeBuildToHash } from '@/lib/url-state';

interface GearContextType {
  version: string;
  setVersion: (v: string) => void;
  availableVersions: string[];
  catalog: VersionCatalog;
  build: GearBuild;
  stats: CalculatedGearStats;
  setGearType: (typeId: string) => void;
  setPartMaterial: (slot: PartSlot, materialId: string, grade?: Grade) => void;
  removePart: (slot: PartSlot) => void;
  loadBuild: (newBuild: GearBuild) => void;
  inventory: Set<string>;
  toggleInventoryMaterial: (materialId: string) => void;
  setAllInventory: (enableAll: boolean) => void;
  lang: 'pt' | 'en';
  setLang: (l: 'pt' | 'en') => void;
  shareUrl: string;
  copyShareUrl: () => Promise<boolean>;
}

const defaultCatalog: VersionCatalog = {
  version: '1.20.1',
  materials: OFFICIAL_MATERIALS_1_20,
  gearTypes: OFFICIAL_GEAR_TYPES,
  traits: OFFICIAL_TRAITS,
};

const initialBuild: GearBuild = {
  gearTypeId: 'sword',
  parts: {
    main: { materialId: 'silentgear:diamond', grade: 'NONE' },
    rod: { materialId: 'silentgear:wood', grade: 'NONE' },
  },
};

const GearContext = createContext<GearContextType | null>(null);

export function GearProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersionState] = useState<string>('1.20.1');
  const availableVersions = ['1.20.1', '1.21.1'];
  const [catalog, setCatalog] = useState<VersionCatalog>(defaultCatalog);
  const [build, setBuild] = useState<GearBuild>(initialBuild);
  const [inventory, setInventory] = useState<Set<string>>(
    new Set(Object.keys(defaultCatalog.materials))
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

    // 2. Inventário
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

    // 3. Hash da URL (Link compartilhado)
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
    async function loadCatalog() {
      try {
        const res = await fetch(`/data/versions/${version}/catalog.json`);
        if (res.ok) {
          const data = await res.json();
          setCatalog(data);
          return;
        }
      } catch (err) {
        console.warn('Fallback to local catalog for version', version);
      }
      setCatalog({ ...defaultCatalog, version });
    }
    loadCatalog();
  }, [version]);

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

    // Mantém as partes compatíveis
    for (const slot of gearType.requiredSlots) {
      if (build.parts[slot]) {
        newParts[slot] = build.parts[slot];
      } else {
        // Padrão: Diamante ou Ferro se main, Madeira se rod
        const fallbackMat = slot === 'main' ? 'silentgear:diamond' : 'silentgear:wood';
        newParts[slot] = { materialId: fallbackMat, grade: 'NONE' };
      }
    }
    setBuild({ gearTypeId: typeId, parts: newParts });
  }

  function setPartMaterial(slot: PartSlot, materialId: string, grade?: Grade) {
    setBuild((prev) => ({
      ...prev,
      parts: {
        ...prev.parts,
        [slot]: { materialId, grade: grade || prev.parts[slot]?.grade || 'NONE' },
      },
    }));
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
        availableVersions,
        catalog,
        build,
        stats,
        setGearType,
        setPartMaterial,
        removePart,
        loadBuild,
        inventory,
        toggleInventoryMaterial,
        setAllInventory,
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
