'use client';

import React, { useState } from 'react';
import { useGear } from '@/context/GearContext';
import { GearCanvas } from '@/components/GearCanvas';
import { SlotPicker } from '@/components/SlotPicker';
import { OptimizerModal } from '@/components/OptimizerModal';
import { GearCategory } from '@/types/silentgear';
import {
  Swords,
  Shield,
  Pickaxe,
  Sparkles,
  Zap,
  Info,
  Flame,
  Award,
} from 'lucide-react';

export default function HomePage() {
  const { catalog, build, stats, setGearType, lang } = useGear();
  const [selectedCategory, setSelectedCategory] = useState<GearCategory | 'all'>('all');

  const gearTypes = Object.values(catalog.gearTypes);
  const currentGearType = catalog.gearTypes[build.gearTypeId] || gearTypes[0];

  const filteredGearTypes = gearTypes.filter((g) => {
    if (selectedCategory === 'all') return true;
    return g.category === selectedCategory;
  });

  const categoryTabs: Array<{ id: GearCategory | 'all'; label: { pt: string; en: string }; icon: React.ReactNode }> = [
    { id: 'all', label: { pt: 'Todos', en: 'All' }, icon: null },
    { id: 'weapon', label: { pt: 'Armas', en: 'Weapons' }, icon: <Swords className="w-3.5 h-3.5" /> },
    { id: 'tool', label: { pt: 'Ferramentas', en: 'Tools' }, icon: <Pickaxe className="w-3.5 h-3.5" /> },
    { id: 'armor', label: { pt: 'Armaduras', en: 'Armor' }, icon: <Shield className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Barra de Seleção de Tipo de Item */}
      <div className="p-4 bg-mc-surface border border-mc-border rounded-xl shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  selectedCategory === tab.id
                    ? 'bg-mc-primary text-mc-bg font-bold shadow-sm'
                    : 'text-mc-muted hover:text-mc-text hover:bg-mc-card'
                }`}
              >
                {tab.icon}
                {tab.label[lang]}
              </button>
            ))}
          </div>

          <div className="text-xs text-mc-muted font-mono">
            {currentGearType.name[lang]} · {currentGearType.category.toUpperCase()}
          </div>
        </div>

        {/* Grade de Ícones dos Tipos de Item */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          {filteredGearTypes.map((gt) => {
            const isSelected = build.gearTypeId === gt.id;
            return (
              <button
                key={gt.id}
                onClick={() => setGearType(gt.id)}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'bg-mc-card border-mc-primary text-mc-text shadow-mc-box scale-[1.02]'
                    : 'bg-mc-bg/60 border-mc-border text-mc-muted hover:border-mc-borderHover hover:text-mc-text'
                }`}
              >
                <div className="font-bold text-xs truncate">{gt.name[lang]}</div>
                <div className="text-[10px] text-mc-muted font-mono capitalize mt-0.5">
                  {gt.category}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grade Principal: Visualizador + Status (Esq) x Slots e Otimizador (Dir) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda (5 cols): Canvas + Painel de Atributos */}
        <div className="lg:col-span-5 space-y-4">
          <GearCanvas size={180} />

          {/* Card de Atributos Calculados */}
          <div className="p-4 bg-mc-surface border border-mc-border rounded-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-mc-border/60 pb-2">
              <h4 className="font-bold text-xs text-mc-muted uppercase tracking-wider font-mono">
                {lang === 'pt' ? 'Atributos Calculados' : 'Calculated Stats'}
              </h4>
              <span className="text-[11px] font-mono text-mc-primary font-bold">
                {stats.synergy}% Sinergia
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              {/* Durabilidade */}
              <div className="p-2.5 rounded bg-mc-bg/70 border border-mc-border">
                <span className="text-[10px] text-mc-muted block">Durabilidade</span>
                <span className="text-base font-bold text-mc-accent">{stats.durability}</span>
              </div>

              {/* Dano Melee / Armadura */}
              {currentGearType.category === 'armor' ? (
                <div className="p-2.5 rounded bg-mc-bg/70 border border-mc-border">
                  <span className="text-[10px] text-mc-muted block">Armadura Total</span>
                  <span className="text-base font-bold text-mc-primary">{stats.armor}</span>
                </div>
              ) : (
                <div className="p-2.5 rounded bg-mc-bg/70 border border-mc-border">
                  <span className="text-[10px] text-mc-muted block">Dano por Golpe</span>
                  <span className="text-base font-bold text-mc-crimson">{stats.meleeDamage}</span>
                </div>
              )}

              {/* Velocidade de Ataque / Tenacidade */}
              {currentGearType.category === 'armor' ? (
                <div className="p-2.5 rounded bg-mc-bg/70 border border-mc-border">
                  <span className="text-[10px] text-mc-muted block">Tenacidade</span>
                  <span className="text-base font-bold text-blue-400">{stats.armorToughness}</span>
                </div>
              ) : (
                <div className="p-2.5 rounded bg-mc-bg/70 border border-mc-border">
                  <span className="text-[10px] text-mc-muted block">Velocidade de Ataque</span>
                  <span className="text-base font-bold text-mc-gold">{stats.attackSpeed}</span>
                </div>
              )}

              {/* DPS / Armadura Mágica */}
              {currentGearType.category === 'armor' ? (
                <div className="p-2.5 rounded bg-mc-bg/70 border border-mc-border">
                  <span className="text-[10px] text-mc-muted block">Armadura Mágica</span>
                  <span className="text-base font-bold text-purple-400">{stats.magicArmor}</span>
                </div>
              ) : (
                <div className="p-2.5 rounded bg-mc-bg/70 border border-mc-border">
                  <span className="text-[10px] text-mc-muted block">DPS Estimado</span>
                  <span className="text-base font-bold text-amber-400">{stats.dps}</span>
                </div>
              )}

              {/* Velocidade de Mineração (para ferramentas) */}
              {currentGearType.category === 'tool' && (
                <>
                  <div className="p-2.5 rounded bg-mc-bg/70 border border-mc-border">
                    <span className="text-[10px] text-mc-muted block">Velocidade Mineração</span>
                    <span className="text-base font-bold text-emerald-400">{stats.harvestSpeed}</span>
                  </div>
                  <div className="p-2.5 rounded bg-mc-bg/70 border border-mc-border">
                    <span className="text-[10px] text-mc-muted block">Nível de Colheita</span>
                    <span className="text-xs font-bold text-mc-text truncate block mt-1">
                      {stats.harvestTier.replace(/^.*:/, '')}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Traits Ativos */}
            <div className="pt-2 border-t border-mc-border/60">
              <span className="text-[10px] font-bold text-mc-muted uppercase tracking-wider font-mono block mb-2">
                {lang === 'pt' ? 'Traits e Habilidades Ativas' : 'Active Traits & Effects'}
              </span>

              {stats.traits.length === 0 ? (
                <p className="text-xs text-mc-muted italic font-mono">
                  {lang === 'pt' ? 'Nenhum trait ativo nesta montagem.' : 'No active traits in this build.'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {stats.traits.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded bg-mc-bg/60 border border-mc-border/60 flex items-start justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-mc-text flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-mc-primary shrink-0" />
                          {t.name[lang] || t.name.en}
                          <span className="text-[10px] px-1 rounded bg-mc-primary/20 text-mc-primary font-mono font-bold">
                            Nvl {t.level}
                          </span>
                        </div>
                        <p className="text-[11px] text-mc-muted mt-0.5">{t.description[lang]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Direita (7 cols): Slots de Peças e Otimizador */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card do Otimizador */}
          <div className="p-4 bg-gradient-to-r from-mc-surface to-mc-card border border-mc-primary/40 rounded-xl shadow-mc-box flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-mc-text flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-mc-primary" />
                {lang === 'pt' ? 'Otimizador de Inventário' : 'Inventory Optimizer'}
              </h3>
              <p className="text-xs text-mc-muted mt-0.5">
                {lang === 'pt'
                  ? 'Descubra a combinação mais forte com os materiais que você possui.'
                  : 'Find the strongest combination using only materials you own.'}
              </p>
            </div>
            <div className="w-full sm:w-auto shrink-0">
              <OptimizerModal />
            </div>
          </div>

          {/* Slots de Montagem */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-mc-muted uppercase tracking-wider font-mono px-1">
              {lang === 'pt' ? 'Componentes da Montagem' : 'Build Components'}
            </h4>

            {/* Slots Obrigatórios */}
            {currentGearType.requiredSlots.map((slot) => (
              <SlotPicker key={slot} slot={slot} isRequired={true} />
            ))}

            {/* Slots Opcionais */}
            {currentGearType.optionalSlots.map((slot) => (
              <SlotPicker key={slot} slot={slot} isRequired={false} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
