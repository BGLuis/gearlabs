'use client';

import React from 'react';
import { useGear } from '@/context/GearContext';
import { Grade, PartSlot, SubMaterialSelection, StarchargeLevel } from '@/types/silentgear';
import { X, ArrowUp, ArrowDown, Plus, Layers, Sparkles } from 'lucide-react';
import { calculateSynergy, getNumericStatValue } from '@/lib/calculator';

interface SlotPickerProps {
  slot: PartSlot;
  isRequired?: boolean;
}

const GRADES: Grade[] = ['NONE', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'MAX'];
const MAX_SUB_MATERIALS = 6;
const STARCHARD_LEVELS: { level: StarchargeLevel; label: string }[] = [
  { level: 0, label: '0' },
  { level: 1, label: 'I' },
  { level: 2, label: 'II' },
  { level: 3, label: 'III' },
];

export function SlotPicker({ slot, isRequired = false }: SlotPickerProps) {
  const {
    catalog,
    build,
    setPartMaterial,
    setPartSubMaterials,
    addSubMaterial,
    removeSubMaterial,
    reorderSubMaterials,
    updateSubMaterial,
    setPartStarcharge,
    removePart,
    inventory,
    lang,
  } = useGear();

  const currentSelection = build.parts[slot];
  const isCompound = !!(currentSelection?.materials && currentSelection.materials.length > 0);

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
  const currentMat = currentSelection?.materialId
    ? catalog.materials[currentSelection.materialId]
    : null;

  // Sub-materiais resolvidos para exibição e cálculo de sinergia
  const subMaterials = isCompound
    ? currentSelection.materials!
        .map((sm) => catalog.materials[sm.materialId])
        .filter(Boolean)
    : [];

  const compoundSynergy = isCompound && subMaterials.length > 1
    ? calculateSynergy(subMaterials, slot)
    : 1.0;

  function handleConvertToCompound() {
    const primaryId = currentSelection?.materialId || validMaterials[0]?.id || 'silentgear:iron';
    const fallbackId = validMaterials.find((m) => m.id !== primaryId)?.id || primaryId;
    const initialMats: SubMaterialSelection[] = [
      { materialId: primaryId, grade: currentGrade },
      { materialId: fallbackId, grade: 'NONE' },
    ];
    setPartSubMaterials(slot, initialMats);
  }

  function handleRevertToSimple() {
    if (currentSelection) {
      const primaryId = currentSelection.materials?.[0]?.materialId || currentSelection.materialId;
      setPartMaterial(slot, primaryId, currentGrade, currentStarcharge);
    }
  }

  return (
    <div className="p-3 bg-mc-surface border border-mc-border rounded-lg shadow-sm">
      {/* Cabeçalho do Slot */}
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

          {isCompound && (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-mc-primary/20 border border-mc-primary/40 text-mc-primary font-mono font-bold">
              <Layers className="w-2.5 h-2.5" />
              {lang === 'pt' ? 'Liga/Composto' : 'Alloy/Compound'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isRequired && currentSelection && (
            <button
              onClick={() => removePart(slot)}
              className="p-1 rounded text-mc-muted hover:text-mc-crimson hover:bg-mc-card transition-colors"
              title={lang === 'pt' ? 'Remover peça' : 'Remove part'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Modo Material Composto */}
      {isCompound ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-mc-muted px-1">
            <span className="flex items-center gap-1 text-mc-gold font-bold">
              <Sparkles className="w-3 h-3" />
              {lang === 'pt' ? 'Sub-materiais da Liga' : 'Compound Sub-materials'}:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-mc-primary">
                ⚡ {Math.round(compoundSynergy * 100)}% {lang === 'pt' ? 'Sinergia' : 'Synergy'}
              </span>
              {currentMat?.stats.main?.charging_value !== undefined && (
                <span className="text-[10px] px-1 rounded bg-cyan-950/60 border border-cyan-800 text-cyan-400" title="Valor base de carga (charging_value)">
                  ⚡ {getNumericStatValue(currentMat.stats.main.charging_value)}
                </span>
              )}
              {/* Seletor de Carga Estelar (Starcharge) no modo composto */}
              <div className="flex items-center gap-1 bg-mc-bg border border-mc-border rounded px-1.5 py-0.5">
                <span className="text-[10px] text-mc-muted font-mono">{lang === 'pt' ? 'Carga:' : 'Charge:'}</span>
                <select
                  value={currentStarcharge}
                  onChange={(e) => {
                    if (currentSelection) {
                      setPartStarcharge(slot, Number(e.target.value) as StarchargeLevel);
                    }
                  }}
                  className="bg-transparent text-cyan-400 font-bold text-xs font-mono focus:outline-none cursor-pointer"
                  title={lang === 'pt' ? 'Nível do Starlight Charger (Starcharged)' : 'Starlight Charger Level (Starcharged)'}
                >
                  {STARCHARD_LEVELS.map(({ level, label }) => (
                    <option key={level} value={level} className="bg-mc-surface text-mc-text">
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Lista de Sub-materiais com reordenação */}
          <div className="space-y-1.5">
            {currentSelection.materials!.map((subMat, idx) => {
              const matObj = catalog.materials[subMat.materialId];
              const isFirst = idx === 0;
              const isLast = idx === currentSelection.materials!.length - 1;

              return (
                <div
                  key={`${subMat.materialId}-${idx}`}
                  className="flex items-center gap-1.5 bg-mc-bg border border-mc-border/80 rounded p-1.5"
                >
                  {/* Indicador de Ordem / Primário */}
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isFirst
                        ? 'bg-mc-gold/20 text-mc-gold border border-mc-gold/40'
                        : 'bg-mc-surface text-mc-muted border border-mc-border'
                    }`}
                    title={isFirst ? (lang === 'pt' ? 'Material Primário (define peso base)' : 'Primary Material (defines base weight)') : undefined}
                  >
                    {idx + 1}º{isFirst ? (lang === 'pt' ? ' Primário' : ' Primary') : ''}
                  </span>

                  {/* Cor do Material */}
                  {matObj && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                      style={{ backgroundColor: matObj.color }}
                    />
                  )}

                  {/* Seletor do Sub-Material */}
                  <select
                    value={subMat.materialId}
                    onChange={(e) => updateSubMaterial(slot, idx, e.target.value, subMat.grade)}
                    className="flex-1 bg-transparent text-mc-text text-xs font-medium focus:outline-none cursor-pointer truncate"
                  >
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

                  {/* Seletor de Grau Individual */}
                  <select
                    value={subMat.grade || 'NONE'}
                    onChange={(e) => updateSubMaterial(slot, idx, subMat.materialId, e.target.value as Grade)}
                    className="bg-mc-surface text-mc-gold font-bold text-[11px] font-mono rounded px-1 py-0.5 border border-mc-border/50 focus:outline-none cursor-pointer"
                    title={lang === 'pt' ? 'Grau do sub-material' : 'Sub-material grade'}
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g} className="bg-mc-surface text-mc-text">
                        {g}
                      </option>
                    ))}
                  </select>

                  {/* Controles de Reordenação e Remoção */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => reorderSubMaterials(slot, idx, idx - 1)}
                      disabled={isFirst}
                      className="p-1 rounded text-mc-muted hover:text-mc-text hover:bg-mc-card disabled:opacity-20 transition-colors"
                      title={lang === 'pt' ? 'Mover para cima (aumenta prioridade)' : 'Move up'}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => reorderSubMaterials(slot, idx, idx + 1)}
                      disabled={isLast}
                      className="p-1 rounded text-mc-muted hover:text-mc-text hover:bg-mc-card disabled:opacity-20 transition-colors"
                      title={lang === 'pt' ? 'Mover para baixo' : 'Move down'}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeSubMaterial(slot, idx)}
                      className="p-1 rounded text-mc-muted hover:text-mc-crimson hover:bg-mc-card transition-colors"
                      title={lang === 'pt' ? 'Remover sub-material' : 'Remove sub-material'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barra de Ações para o Composto */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => {
                const nextId = validMaterials.find(
                  (m) => !currentSelection.materials!.some((sm) => sm.materialId === m.id)
                )?.id || validMaterials[0]?.id || 'silentgear:iron';
                addSubMaterial(slot, nextId, 'NONE');
              }}
              disabled={currentSelection.materials!.length >= MAX_SUB_MATERIALS}
              className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-mc-card hover:bg-mc-border text-mc-text border border-mc-border disabled:opacity-40 transition-colors"
            >
              <Plus className="w-3 h-3" />
              {lang === 'pt' ? 'Adicionar Sub-material' : 'Add Sub-material'} ({currentSelection.materials!.length}/{MAX_SUB_MATERIALS})
            </button>

            <button
              onClick={handleRevertToSimple}
              className="text-[11px] font-mono text-mc-muted hover:text-mc-text underline transition-colors"
            >
              {lang === 'pt' ? 'Voltar para material simples' : 'Switch to single material'}
            </button>
          </div>
        </div>
      ) : (
        /* Modo Material Único (Simples) */
        <div>
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
              <span className="text-[10px] text-mc-muted font-mono">{lang === 'pt' ? 'Grau:' : 'Grade:'}</span>
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
              <span className="text-[10px] text-mc-muted font-mono">{lang === 'pt' ? 'Carga:' : 'Charge:'}</span>
              <select
                value={currentStarcharge}
                onChange={(e) => {
                  if (currentSelection) {
                    setPartMaterial(slot, currentSelection.materialId, currentGrade, Number(e.target.value) as StarchargeLevel);
                  }
                }}
                disabled={!currentSelection}
                className="w-full bg-transparent text-cyan-400 font-bold text-xs font-mono focus:outline-none cursor-pointer disabled:opacity-40"
                title={lang === 'pt' ? 'Nível do Starlight Charger (Starcharged)' : 'Starlight Charger Level (Starcharged)'}
              >
                {STARCHARD_LEVELS.map(({ level, label }) => (
                  <option key={level} value={level} className="bg-mc-surface text-mc-text">
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detalhes do Material Selecionado e Botão para Compor Liga */}
          {currentSelection && currentSelection.materialId && (
            <div className="mt-2 pt-2 border-t border-mc-border/60 flex items-center justify-between text-[11px] text-mc-muted font-mono">
              <div className="flex items-center gap-2">
                {catalog.materials[currentSelection.materialId] && (
                  <>
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
                      style={{ backgroundColor: catalog.materials[currentSelection.materialId].color }}
                    />
                    <span className="text-mc-text font-semibold">
                      {catalog.materials[currentSelection.materialId].name[lang]}
                    </span>
                    <span className="text-[10px] px-1 rounded bg-mc-card border border-mc-border capitalize">
                      {catalog.materials[currentSelection.materialId].category}
                    </span>
                  </>
                )}
              </div>

              <button
                onClick={handleConvertToCompound}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-mc-card hover:bg-mc-primary/20 border border-mc-border hover:border-mc-primary text-mc-text hover:text-mc-primary transition-colors"
                title={lang === 'pt' ? 'Compor múltiplos materiais como liga metálica ou tecido misto' : 'Compose multiple materials into an alloy or mixed fabric'}
              >
                <Layers className="w-3 h-3 text-mc-primary" />
                {lang === 'pt' ? 'Compor Liga/Tecido...' : 'Compose Alloy...'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
