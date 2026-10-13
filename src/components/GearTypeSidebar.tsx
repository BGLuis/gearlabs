'use client';

import React from 'react';
import { useGear } from '@/context/GearContext';
import { GearCategory, GearType } from '@/types/silentgear';
import { Swords, Pickaxe, Axe, Shield, Crosshair, Wrench } from 'lucide-react';

export function GearTypeSidebar() {
  const { catalog, build, setGearType, lang } = useGear();

  const gearTypes = Object.values(catalog.gearTypes);

  const getIcon = (typeId: string, category: GearCategory) => {
    switch (typeId) {
      case 'sword':
        return <Swords className="w-4 h-4" />;
      case 'katana':
        return <Swords className="w-4 h-4 text-mc-forge" />;
      case 'pickaxe':
        return <Pickaxe className="w-4 h-4" />;
      case 'axe':
        return <Axe className="w-4 h-4" />;
      case 'helmet':
      case 'chestplate':
      case 'leggings':
      case 'boots':
        return <Shield className="w-4 h-4" />;
      case 'bow':
      case 'crossbow':
        return <Crosshair className="w-4 h-4" />;
      default:
        if (category === 'weapon') return <Swords className="w-4 h-4" />;
        if (category === 'tool') return <Pickaxe className="w-4 h-4" />;
        if (category === 'armor') return <Shield className="w-4 h-4" />;
        return <Wrench className="w-4 h-4" />;
    }
  };

  const categories: Array<{ id: GearCategory; label: { pt: string; en: string } }> = [
    { id: 'weapon', label: { pt: 'Armas', en: 'Weapons' } },
    { id: 'tool', label: { pt: 'Ferramentas', en: 'Tools' } },
    { id: 'armor', label: { pt: 'Armaduras', en: 'Armor' } },
    { id: 'ranged', label: { pt: 'À Distância', en: 'Ranged' } },
  ];

  return (
    <div className="space-y-5">
      {categories.map((cat) => {
        const items = gearTypes.filter((g) => g.category === cat.id);
        if (items.length === 0) return null;

        return (
          <div key={cat.id} className="space-y-2">
            <h3 className="px-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-mc-mutedLight/70">
              {cat.label[lang]}
            </h3>

            <div className="space-y-1.5">
              {items.map((gt) => {
                const isSelected = build.gearTypeId === gt.id;
                const totalSlots = (gt.requiredSlots?.length || 0) + (gt.optionalSlots?.length || 0);
                const reqSlots = gt.requiredSlots?.length || 0;

                return (
                  <button
                    key={gt.id}
                    onClick={() => setGearType(gt.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-[8px] transition-all text-left ${
                      isSelected
                        ? 'bg-mc-card border border-mc-forge shadow-sm text-mc-text'
                        : 'bg-[#16181B]/70 hover:bg-mc-card/60 border border-mc-border text-mc-mutedLight hover:text-mc-text'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-mc-cardSubtle border border-mc-forge/60 text-mc-forge'
                          : 'bg-mc-cardSubtle border border-mc-border text-mc-muted'
                      }`}
                    >
                      {getIcon(gt.id, gt.category)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm leading-tight truncate text-mc-text">
                        {gt.name[lang] || gt.name.en || gt.id}
                      </div>
                      <div className="text-[11px] font-mono text-mc-muted mt-0.5">
                        {totalSlots} {lang === 'pt' ? 'peças' : 'parts'} · {reqSlots}{' '}
                        {lang === 'pt' ? 'obrig.' : 'req.'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
