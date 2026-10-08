'use client';

import React from 'react';
import { useGear } from '@/context/GearContext';
import { Grade, PartSlot, StarchargeLevel } from '@/types/silentgear';
import { getNumericStatValue } from '@/lib/calculator';
import { X, CheckCircle2 } from 'lucide-react';

interface SlotPickerProps {
  slot: PartSlot;
  isRequired?: boolean;
}

const GRADES: Grade[] = ['NONE', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'MAX'];
const STARCHARD_LEVELS: { level: StarchargeLevel; label: string }[] = [
  { level: 0, label: '0' },
  { level: 1, label: 'I' },
  { level: 2, label: 'II' },
  { level: 3, label: 'III' },
];

export function SlotPicker({ slot, isRequired = false }: SlotPickerProps) {
  const { catalog, build, setPartMaterial, removePart, inventory, lang } = useGear();
  const currentSelection = build.parts[slot];
  const currentMat = currentSelection ? catalog.materials[currentSelection.materialId] : null;

  // Filtrar materiais que suportam este slot
  const validMaterials = Object.values(catalog.materials).filter((m) => {
    if (slot === 'main') return !!m.stats.main;
    if (slot === 'rod') return !!m.stats.rod || !!m.statModifiers?.rod;
    if (slot === 'tip') return !!m.stats.tip;
    return !!m.stats[slot];
  });

  const slotLabels: Record<PartSlot, { pt: string; en: string }> = {
    main: { pt: 'Parte Principal (Lâmina/Placa)', en: 'Main Part (Blade/Plate)' },
    rod: { pt: 'Haste / Cabo', en: 'Rod / Handle' },
    tip: { pt: 'Ponta / Reforço', en: 'Tip Upgrade' },
    coating: { pt: 'Revestimento', en: 'Coating' },
    grip: { pt: 'Empunhadura', en: 'Grip' },
    lining: { pt: 'Forro', en: 'Lining' },
    binding: { pt: 'Amarração', en: 'Binding' },
  };

  const currentGrade = currentSelection?.grade || 'NONE';
  const currentStarcharge: StarchargeLevel = currentSelection?.starcharge ?? 0;

  return (
    <div className="p-3 bg-mc-surface border border-mc-border rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-mc-text uppercase tracking-wider font-mono">
            {slotLabels[slot][lang]}
          </span>
          {isRequired ? (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-mc-crimson/20 border border-mc-crimson/50 text-mc-crimson font-mono">
              {lang === 'pt' ? 'Obrigatório' : 'Required'}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-mc-border text-mc-muted font-mono">
              {lang === 'pt' ? 'Opcional' : 'Optional'}
            </span>
          )}
        </div>

        {!isRequired && currentSelection && (
          <button
            onClick={() => removePart(slot)}
            className="p-1 rounded text-mc-muted hover:text-mc-crimson hover:bg-mc-card transition-colors"
            title="Remover peça"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        {/* Seletor de Material */}
        <div className="sm:col-span-2 relative">
          <select
            value={currentSelection?.materialId || ''}
            onChange={(e) => {
              if (e.target.value) {
                setPartMaterial(slot, e.target.value, currentGrade, currentStarcharge);
              } else if (!isRequired) {
                removePart(slot);
              }
            }}
            className="w-full bg-mc-bg border border-mc-border text-mc-text text-xs rounded px-2.5 py-2 font-medium focus:border-mc-primary focus:outline-none cursor-pointer"
          >
            {!isRequired && (
              <option value="">{lang === 'pt' ? '(Nenhum / Vazio)' : '(None / Empty)'}</option>
            )}
            {validMaterials.map((mat) => {
              const inInv = inventory.has(mat.id);
              return (
                <option key={mat.id} value={mat.id} className="bg-mc-surface text-mc-text">
                  {inInv ? '✓ ' : '○ '}
                  {mat.name[lang] || mat.name.en} [Tier {mat.tier}]
                </option>
              );
            })}
          </select>
        </div>

        {/* Seletor de Grau (Grade) */}
        <div className="flex items-center gap-1.5 bg-mc-bg border border-mc-border rounded px-2 py-1">
          <span className="text-[10px] text-mc-muted font-mono">Grau:</span>
          <select
            value={currentGrade}
            onChange={(e) => {
              if (currentSelection) {
                setPartMaterial(slot, currentSelection.materialId, e.target.value as Grade, currentStarcharge);
              }
            }}
            disabled={!currentSelection}
            className="w-full bg-transparent text-mc-gold font-bold text-xs font-mono focus:outline-none cursor-pointer disabled:opacity-40"
          >
            {GRADES.map((g) => (
              <option key={g} value={g} className="bg-mc-surface text-mc-text">
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Seletor de Carga Estelar (Starcharge) */}
        <div className="flex items-center gap-1.5 bg-mc-bg border border-mc-border rounded px-2 py-1">
          <span className="text-[10px] text-mc-muted font-mono">Carga:</span>
          <select
            value={currentStarcharge}
            onChange={(e) => {
              if (currentSelection) {
                setPartMaterial(slot, currentSelection.materialId, currentGrade, Number(e.target.value) as StarchargeLevel);
              }
            }}
            disabled={!currentSelection}
            className="w-full bg-transparent text-cyan-400 font-bold text-xs font-mono focus:outline-none cursor-pointer disabled:opacity-40"
            title="Nível do Starlight Charger (Starcharged)"
          >
            {STARCHARD_LEVELS.map(({ level, label }) => (
              <option key={level} value={level} className="bg-mc-surface text-mc-text">
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Detalhes do Material Selecionado */}
      {currentMat && (
        <div className="mt-2.5 pt-2 border-t border-mc-border/60 flex items-center justify-between text-[11px] text-mc-muted font-mono">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
              style={{ backgroundColor: currentMat.color }}
            />
            <span className="text-mc-text font-semibold">{currentMat.name[lang]}</span>
            <span className="text-[10px] px-1 rounded bg-mc-card border border-mc-border capitalize">
              {currentMat.category}
            </span>
            {currentMat.stats.main?.charging_value !== undefined && (
              <span className="text-[10px] px-1 rounded bg-cyan-950/60 border border-cyan-800 text-cyan-400" title="Valor base de carga (charging_value)">
                ⚡ {getNumericStatValue(currentMat.stats.main.charging_value)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {inventory.has(currentMat.id) ? (
              <span className="text-mc-accent flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {lang === 'pt' ? 'No inventário' : 'In inventory'}
              </span>
            ) : (
              <span className="text-mc-muted">
                {lang === 'pt' ? 'Indisponível' : 'Unavailable'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
