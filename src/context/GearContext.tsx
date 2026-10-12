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
  AlloyType,
  PartMaterialInstance,
  GearPartSelection,
  AddonConfig,
} from '@/types/silentgear';
import {
  ATM11_CATALOG,
  VERSION_PRESETS,
  OFFICIAL_GEAR_TYPES,
  OFFICIAL_TRAITS,
} from '@/data/defaultCatalog';
import { calculateGearStats } from '@/lib/calculator';
import { resolveCatalogWithAddons } from '@/lib/layer-resolver';
import { decodeBuildFromHash, encodeBuildToHash } from '@/lib/url-state';
import {
  addPartSubMaterial,
  removePartSubMaterial,
  reorderPartSubMaterials,
  updatePartSubMaterial,
  setPartSubMaterialsInPart,
  setPartAlloyTypeInPart,
  updatePartInstanceGrade,
  updatePartInstanceStarcharge,
  setPartInstancesInPart,
  createDefaultPartInstances,
  getPartInstanceCount,
  syncPartInstancesWithCount,
} from '@/lib/parts';

interface GearContextType {
  version: string;
  setVersion: (v: string) => void;
  presets: VersionPreset[];
  catalog: VersionCatalog;
  addons: AddonConfig[];
  activeAddons: string[];
  toggleAddon: (addonId: string) => void;
  setAddonEnabled: (addonId: string, enabled: boolean) => void;
  build: GearBuild;
  stats: CalculatedGearStats;
  setGearType: (typeId: string) => void;
  setPartMaterial: (slot: PartSlot, materialId: string, grade?: Grade, starcharge?: StarchargeLevel) => void;
  setPartGrade: (slot: PartSlot, grade: Grade) => void;
  setPartSubMaterials: (slot: PartSlot, materials: SubMaterialSelection[], alloyType?: AlloyType) => void;
  setPartAlloyType: (slot: PartSlot, alloyType: AlloyType) => void;
  setPartInstanceGrade: (slot: PartSlot, index: number, grade: Grade) => void;
  setPartInstanceStarcharge: (slot: PartSlot, index: number, starcharge: StarchargeLevel) => void;
  setPartInstances: (slot: PartSlot, instances: PartMaterialInstance[]) => void;
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
  const [rawCatalog, setRawCatalog] = useState<VersionCatalog>(ATM11_CATALOG);
  const [activeAddons, setActiveAddons] = useState<string[]>(() => {
    return (ATM11_CATALOG.addons || []).filter((a) => a.enabled !== false).map((a) => a.id);
  });
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
    function setupCatalog(data: VersionCatalog) {
      setRawCatalog(data);

      // Ler addons salvos no localStorage para esta versão ou usar defaults
      let initialActive: string[] = [];
      const savedAddons = typeof window !== 'undefined' ? localStorage.getItem(`gearlabs_addons_${version}`) : null;
      if (savedAddons) {
        try {
          const parsed = JSON.parse(savedAddons);
          if (Array.isArray(parsed)) {
            initialActive = parsed;
          }
        } catch (e) {
          console.error('Failed to parse saved addons', e);
        }
      } else if (data.addons) {
        initialActive = data.addons.filter((a) => a.enabled !== false).map((a) => a.id);
      }
      setActiveAddons(initialActive);
    }

    if (customCatalogs[version]) {
      setupCatalog(customCatalogs[version]);
      return;
    }

    // Buscar do endpoint estático
    async function loadCatalog() {
      try {
        const res = await fetch(`/data/versions/${version}/catalog.json`);
        if (res.ok) {
          const data = await res.json();
          setupCatalog(data);
          return;
        }
      } catch (err) {
        console.warn('Fallback to ATM11 catalog for version', version);
      }
      setupCatalog(ATM11_CATALOG);
    }
    loadCatalog();
  }, [version, customCatalogs]);

  // Resolver o catálogo efetivo aplicando camadas de addons ativos
  useEffect(() => {
    let resolvedMaterials = rawCatalog.materials;
    if (rawCatalog.baseMaterials && rawCatalog.layers) {
      resolvedMaterials = resolveCatalogWithAddons(
        rawCatalog.baseMaterials,
        rawCatalog.layers,
        activeAddons
      );
    }

    const effectiveAddons = (rawCatalog.addons || []).map((a) => ({
      ...a,
      enabled: activeAddons.includes(a.id),
    }));

    setCatalog({
      ...rawCatalog,
      materials: resolvedMaterials,
      addons: effectiveAddons,
    });
  }, [rawCatalog, activeAddons]);

  // Atualizar inventário e validar integridade da build quando o catálogo resolvido muda
  useEffect(() => {
    // 1. Filtrar inventário para remover materiais que deixaram de existir
    setInventory((prev) => {
      const available = new Set(Object.keys(catalog.materials));
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      for (const id of prev) {
        if (available.has(id)) {
          next.add(id);
        }
      }
      return next;
    });

    // 2. Garantir que slots da build não apontem para materiais inexistentes
    setBuild((prevBuild) => {
      let changed = false;
      const nextParts = { ...prevBuild.parts };
      const availableIds = Object.keys(catalog.materials);
      if (availableIds.length === 0) return prevBuild;
      const fallbackId = availableIds.includes('silentgear:iron') ? 'silentgear:iron' : availableIds[0];

      for (const [slotKey, part] of Object.entries(nextParts)) {
        const slot = slotKey as PartSlot;
        if (!part) continue;
        let partChanged = false;
        let newMatId = part.materialId;
        if (!catalog.materials[part.materialId]) {
          newMatId = fallbackId;
          partChanged = true;
        }

        let newMaterials = part.materials;
        if (newMaterials) {
          const filteredSubs = newMaterials.filter((sub: SubMaterialSelection) => Boolean(catalog.materials[sub.materialId]));
          if (filteredSubs.length !== newMaterials.length) {
            newMaterials = filteredSubs.length > 0 ? filteredSubs : [{ materialId: newMatId, grade: 'NONE' }];
            partChanged = true;
          }
        }

        let newInstances = part.instances;
        if (newInstances) {
          const filteredInst = newInstances.map((inst) => {
            if (inst.materialId && !catalog.materials[inst.materialId]) {
              partChanged = true;
              return { ...inst, materialId: newMatId };
            }
            return inst;
          });
          newInstances = filteredInst;
        }

        if (partChanged) {
          changed = true;
          nextParts[slot] = {
            ...part,
            materialId: newMatId,
            ...(newMaterials && { materials: newMaterials }),
            ...(newInstances && { instances: newInstances }),
          };
        }
      }
      return changed ? { ...prevBuild, parts: nextParts } : prevBuild;
    });
  }, [catalog]);

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
    const newParts: Partial<Record<PartSlot, GearPartSelection>> = {};

    for (const slot of gearType.requiredSlots) {
      if (build.parts[slot] && catalog.materials[build.parts[slot]!.materialId]) {
        const existingPart = build.parts[slot]!;
        const targetCount = getPartInstanceCount(typeId, slot);
        newParts[slot] = existingPart.instances
          ? {
              ...existingPart,
              instances: syncPartInstancesWithCount(existingPart, targetCount),
            }
          : existingPart;
      } else {
        const firstAvailable = Object.keys(catalog.materials)[0] || 'silentgear:unobtainium';
        newParts[slot] = { materialId: firstAvailable, grade: 'NONE' };
      }
    }
    setBuild({ gearTypeId: typeId, parts: newParts });
  }

  function setPartMaterial(slot: PartSlot, materialId: string, grade?: Grade, starcharge?: StarchargeLevel) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      const effectiveGrade = grade !== undefined ? grade : (current?.grade || 'NONE');
      const effectiveStarcharge = starcharge !== undefined ? starcharge : (current?.starcharge || 0);
      const count = getPartInstanceCount(prev.gearTypeId, slot);
      const instances = current?.instances
        ? syncPartInstancesWithCount(current, count)
        : createDefaultPartInstances(count, effectiveGrade, effectiveStarcharge);
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: {
            materialId,
            grade: effectiveGrade,
            starcharge: effectiveStarcharge,
            materials: undefined,
            instances,
          },
        },
      };
    });
  }

  function setPartGrade(slot: PartSlot, grade: Grade) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      if (!current) return prev;
      const count = getPartInstanceCount(prev.gearTypeId, slot);
      const instances = current.instances
        ? current.instances.map((i) => ({ ...i, grade }))
        : createDefaultPartInstances(count, grade, current.starcharge || 0);
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: {
            ...current,
            grade,
            instances,
          },
        },
      };
    });
  }

  function setPartInstanceGrade(slot: PartSlot, index: number, grade: Grade) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      if (!current) return prev;
      const nextPart = updatePartInstanceGrade(current, index, grade, prev.gearTypeId, slot);
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: nextPart,
        },
      };
    });
  }

  function setPartInstanceStarcharge(slot: PartSlot, index: number, starcharge: StarchargeLevel) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      if (!current) return prev;
      const nextPart = updatePartInstanceStarcharge(current, index, starcharge, prev.gearTypeId, slot);
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: nextPart,
        },
      };
    });
  }

  function setPartInstances(slot: PartSlot, instances: PartMaterialInstance[]) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      if (!current) return prev;
      const nextPart = setPartInstancesInPart(current, instances);
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: nextPart,
        },
      };
    });
  }

  function setPartSubMaterials(slot: PartSlot, materials: SubMaterialSelection[], alloyType?: AlloyType) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      const nextPart = setPartSubMaterialsInPart(current, materials, alloyType);
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: {
            ...nextPart,
            starcharge: current?.starcharge || 0,
          },
        },
      };
    });
  }

  function setPartAlloyType(slot: PartSlot, alloyType: AlloyType) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      const nextPart = setPartAlloyTypeInPart(current, alloyType);
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: {
            ...nextPart,
            starcharge: current?.starcharge || 0,
          },
        },
      };
    });
  }

  function addSubMaterial(slot: PartSlot, materialId: string, _grade: Grade = 'NONE') {
    setBuild((prev) => {
      const current = prev.parts[slot];
      const nextPart = addPartSubMaterial(current, materialId, current?.alloyType);
      if (nextPart === current) return prev;
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: {
            ...nextPart,
            starcharge: current?.starcharge || 0,
          },
        },
      };
    });
  }

  function removeSubMaterial(slot: PartSlot, index: number) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      const nextPart = removePartSubMaterial(current, index);
      if (nextPart === current) return prev;
      if (nextPart === null) {
        const nextParts = { ...prev.parts };
        delete nextParts[slot];
        return { ...prev, parts: nextParts };
      }
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: {
            ...nextPart,
            starcharge: current?.starcharge || 0,
          },
        },
      };
    });
  }

  function reorderSubMaterials(slot: PartSlot, fromIndex: number, toIndex: number) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      const nextPart = reorderPartSubMaterials(current, fromIndex, toIndex);
      if (!nextPart || nextPart === current) return prev;
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: nextPart,
        },
      };
    });
  }

  function updateSubMaterial(slot: PartSlot, index: number, materialId: string, _grade?: Grade) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      const nextPart = updatePartSubMaterial(current, index, materialId);
      if (!nextPart || nextPart === current) return prev;
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: nextPart,
        },
      };
    });
  }

  function setPartStarcharge(slot: PartSlot, starcharge: StarchargeLevel) {
    setBuild((prev) => {
      const current = prev.parts[slot];
      if (!current) return prev;
      const count = getPartInstanceCount(prev.gearTypeId, slot);
      const instances = current.instances
        ? current.instances.map((i) => ({ ...i, starcharge }))
        : createDefaultPartInstances(count, current.grade || 'NONE', starcharge);
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [slot]: {
            ...current,
            starcharge,
            instances,
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

  function toggleAddon(addonId: string) {
    setActiveAddons((prev) => {
      const next = prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId];
      if (typeof window !== 'undefined') {
        localStorage.setItem(`gearlabs_addons_${version}`, JSON.stringify(next));
      }
      return next;
    });
  }

  function setAddonEnabled(addonId: string, enabled: boolean) {
    setActiveAddons((prev) => {
      const next = enabled
        ? Array.from(new Set([...prev, addonId]))
        : prev.filter((id) => id !== addonId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`gearlabs_addons_${version}`, JSON.stringify(next));
      }
      return next;
    });
  }

  return (
    <GearContext.Provider
      value={{
        version,
        setVersion,
        presets,
        catalog,
        addons: catalog.addons || [],
        activeAddons,
        toggleAddon,
        setAddonEnabled,
        build,
        stats,
        setGearType,
        setPartMaterial,
        setPartGrade,
        setPartSubMaterials,
        setPartAlloyType,
        setPartInstanceGrade,
        setPartInstanceStarcharge,
        setPartInstances,
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
