'use client';

import React, { useState } from 'react';
import { useGear } from '@/context/GearContext';
import { Grade, OptimizationGoal, OptimizedBuildResult, StarchargeLevel } from '@/types/silentgear';
import { findBestBuilds } from '@/lib/optimizer';
import { getMainPartLabel } from '@/lib/parts';
import { Sparkles, X, Check, Shield, Swords, Zap, Pickaxe, Scale, Heart } from 'lucide-react';

export function OptimizerModal() {
  const { catalog, build, inventory, loadBuild, lang } = useGear();
  const [isOpen, setIsOpen] = useState(false);
  const [goal, setGoal] = useState<OptimizationGoal>('max_damage');
  const [grade, setGrade] = useState<Grade>('NONE');
  const [starcharge, setStarcharge] = useState<StarchargeLevel>(0);
  const [allowAlloys, setAllowAlloys] = useState(true);

  const currentGearType = catalog.gearTypes[build.gearTypeId];
  const isArmor = currentGearType?.category === 'armor';

  const goals: Array<{ id: OptimizationGoal; label: { pt: string; en: string }; icon: React.ReactNode; desc: { pt: string; en: string } }> = [
    {
      id: 'max_damage',
      label: { pt: 'Dano Máximo', en: 'Max Damage' },
      icon: <Swords className="w-4 h-4 text-mc-crimson" />,
      desc: { pt: 'Maior dano bruto por golpe único', en: 'Highest raw damage per hit' },
    },
    {
      id: 'max_dps',
      label: { pt: 'Maior DPS', en: 'Highest DPS' },
      icon: <Zap className="w-4 h-4 text-mc-gold" />,
      desc: { pt: 'Equilíbrio entre dano e velocidade de ataque', en: 'Balance between damage and attack speed' },
    },
    {
      id: 'max_durability',
      label: { pt: 'Maior Durabilidade', en: 'Max Durability' },
      icon: <Heart className="w-4 h-4 text-mc-accent" />,
      desc: { pt: 'Máxima vida útil e número de usos', en: 'Highest lifespan and usage count' },
    },
    {
      id: 'max_protection',
      label: { pt: 'Máxima Proteção', en: 'Max Protection' },
      icon: <Shield className="w-4 h-4 text-mc-primary" />,
      desc: { pt: 'Prioriza Armadura e Armor Toughness', en: 'Prioritizes Armor and Toughness' },
    },
    {
      id: 'max_harvest',
      label: { pt: 'Mineração Rápida', en: 'Fast Mining' },
      icon: <Pickaxe className="w-4 h-4 text-amber-400" />,
      desc: { pt: 'Maior velocidade de quebra de blocos', en: 'Fastest block breaking speed' },
    },
    {
      id: 'balanced',
      label: { pt: 'Equilíbrio Geral', en: 'Balanced Build' },
      icon: <Scale className="w-4 h-4 text-purple-400" />,
      desc: { pt: 'Harmonia entre dano, vida e velocidade', en: 'Harmonious mix of damage, life, and speed' },
    },
  ];

  // Filtra metas relevantes (ex: proteção para armaduras, dano para armas)
  const filteredGoals = goals.filter((g) => {
    if (isArmor) {
      return ['max_protection', 'max_durability', 'balanced'].includes(g.id);
    }
    if (currentGearType?.category === 'tool') {
      return ['max_harvest', 'max_durability', 'max_damage', 'balanced'].includes(g.id);
    }
    return ['max_damage', 'max_dps', 'max_durability', 'balanced'].includes(g.id);
  });

  const availableList = React.useMemo(() => Array.from(inventory), [inventory]);

  const results: OptimizedBuildResult[] = React.useMemo(() => {
    if (!isOpen) return [];
    try {
      return findBestBuilds(
        {
          gearTypeId: build.gearTypeId,
          availableMaterials: availableList,
          goal,
          grade,
          starcharge,
          allowAlloys,
        },
        catalog,
        3
      );
    } catch (e) {
      console.error('Error optimizing builds', e);
      return [];
    }
  }, [isOpen, build.gearTypeId, availableList, goal, grade, starcharge, allowAlloys, catalog]);

  const handleApply = (res: OptimizedBuildResult) => {
    loadBuild(res.build);
    setIsOpen(false);
  };

  return (
    <>
      {/* Botão de Disparo */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-mc-primary to-mc-accent hover:from-mc-primaryHover hover:to-emerald-500 text-mc-bg font-bold text-sm shadow-mc-box flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <Sparkles className="w-4 h-4" />
        {lang === 'pt' ? 'Sugerir Melhor Combinação' : 'Suggest Best Build'}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-mc-surface border border-mc-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header do Modal */}
            <div className="p-4 border-b border-mc-border flex items-center justify-between bg-mc-card/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-mc-primary/20 border border-mc-primary/40 text-mc-primary">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-mc-text">
                    {lang === 'pt' ? 'Otimizador Combinatório de Equipamento' : 'Gear Combinatorial Optimizer'}
                  </h3>
                  <p className="text-xs text-mc-muted font-mono">
                    {availableList.length} {lang === 'pt' ? 'materiais disponíveis no seu inventário' : 'materials available in your inventory'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-mc-muted hover:text-mc-text hover:bg-mc-card transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Seleção de Objetivo */}
              <div>
                <label className="block text-xs font-bold text-mc-muted uppercase tracking-wider font-mono mb-2">
                  {lang === 'pt' ? 'Selecione a Meta de Otimização:' : 'Select Optimization Goal:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredGoals.map((g) => {
                    const isSelected = goal === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setGoal(g.id)}
                        className={`p-2.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                          isSelected
                            ? 'bg-mc-card border-mc-primary text-mc-text shadow-sm'
                            : 'bg-mc-bg/50 border-mc-border text-mc-muted hover:border-mc-borderHover hover:text-mc-text'
                        }`}
                      >
                        <div className="p-1.5 rounded bg-mc-surface border border-mc-border mt-0.5">
                          {g.icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5 text-mc-text">
                            {g.label[lang]}
                            {isSelected && <Check className="w-3.5 h-3.5 text-mc-primary" />}
                          </div>
                          <div className="text-[11px] text-mc-muted leading-tight mt-0.5">
                            {g.desc[lang]}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opções de Endgame: Grau, Starcharge e Ligas */}
              <div className="p-3 bg-mc-bg/40 border border-mc-border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-mc-text font-mono uppercase tracking-wider">
                    {lang === 'pt' ? 'Configurações de Endgame:' : 'Endgame Settings:'}
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-mc-muted hover:text-mc-text">
                    <input
                      type="checkbox"
                      checked={allowAlloys}
                      onChange={(e) => setAllowAlloys(e.target.checked)}
                      className="rounded border-mc-border text-mc-primary focus:ring-0"
                    />
                    <span>{lang === 'pt' ? 'Explorar Ligas' : 'Explore Alloys'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Grau */}
                  <div>
                    <label className="block text-[11px] font-mono text-mc-muted mb-1">
                      {lang === 'pt' ? 'Grau Máximo:' : 'Max Grade:'}
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {(['NONE', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'MAX'] as Grade[]).map((g) => (
                        <button
                          key={g}
                          onClick={() => setGrade(g)}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold border transition-colors ${
                            grade === g
                              ? 'bg-mc-gold/20 border-mc-gold text-mc-gold'
                              : 'bg-mc-surface border-mc-border text-mc-muted hover:text-mc-text'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Starcharge */}
                  <div>
                    <label className="block text-[11px] font-mono text-mc-muted mb-1">
                      {lang === 'pt' ? 'Starlight Charger:' : 'Starlight Charger:'}
                    </label>
                    <div className="flex gap-1.5">
                      {([0, 1, 2, 3] as StarchargeLevel[]).map((sc) => (
                        <button
                          key={sc}
                          onClick={() => setStarcharge(sc)}
                          className={`flex-1 py-1 rounded text-xs font-mono font-bold border transition-colors flex items-center justify-center gap-1 ${
                            starcharge === sc
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                              : 'bg-mc-surface border-mc-border text-mc-muted hover:text-mc-text'
                          }`}
                        >
                          <span>{sc === 0 ? '0' : `⭐ ${['', 'I', 'II', 'III'][sc]}`}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resultados Sugeridos */}
              <div>
                <label className="block text-xs font-bold text-mc-muted uppercase tracking-wider font-mono mb-2">
                  {lang === 'pt' ? 'Top 3 Melhores Combinações Calculadas:' : 'Top 3 Calculated Builds:'}
                </label>

                {results.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-mc-border rounded-lg bg-mc-bg/30">
                    <p className="text-sm text-mc-muted">
                      {lang === 'pt'
                        ? 'Nenhuma combinação viável com os materiais marcados no seu inventário.'
                        : 'No valid combinations found with your currently selected inventory.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((res, index) => {
                      const medalColors = [
                        'border-mc-gold text-mc-gold bg-mc-gold/10',
                        'border-slate-300 text-slate-300 bg-slate-400/10',
                        'border-amber-700 text-amber-600 bg-amber-800/10',
                      ];

                      const mainMat = res.build.parts.main
                        ? catalog.materials[res.build.parts.main.materialId]
                        : null;
                      const rodMat = res.build.parts.rod
                        ? catalog.materials[res.build.parts.rod.materialId]
                        : null;
                      const tipMat = res.build.parts.tip
                        ? catalog.materials[res.build.parts.tip.materialId]
                        : null;

                      return (
                        <div
                          key={index}
                          className="p-3.5 bg-mc-card border border-mc-border hover:border-mc-primary/60 rounded-lg transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold font-mono text-xs border ${
                                medalColors[index] || 'border-mc-border text-mc-muted'
                              }`}
                            >
                              #{index + 1}
                            </div>

                            <div>
                              {/* Peças usadas */}
                              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-mc-text">
                                {res.build.parts.main?.materials && res.build.parts.main.materials.length > 1 ? (
                                  <span className="flex items-center gap-1 text-mc-accent">
                                    <span>⚡ {lang === 'pt' ? 'Liga' : 'Alloy'}:</span>
                                    <span className="flex items-center gap-1 text-mc-text font-normal">
                                      {res.build.parts.main.materials.map((sm, smIdx) => {
                                        const mat = catalog.materials[sm.materialId];
                                        return (
                                          <span key={smIdx} className="inline-flex items-center gap-0.5">
                                            {mat && (
                                              <span
                                                className="w-2 h-2 rounded-full inline-block"
                                                style={{ backgroundColor: mat.color }}
                                              />
                                            )}
                                            {mat?.name[lang] || sm.materialId}
                                            {smIdx < res.build.parts.main!.materials!.length - 1 ? ',' : ''}
                                          </span>
                                        );
                                      })}
                                    </span>
                                  </span>
                                ) : (
                                  mainMat && (
                                    <span className="flex items-center gap-1">
                                      <span
                                        className="w-2 h-2 rounded-full inline-block"
                                        style={{ backgroundColor: mainMat.color }}
                                      />
                                      {mainMat.name[lang]} ({getMainPartLabel(build.gearTypeId, currentGearType?.category, lang)})
                                    </span>
                                  )
                                )}
                                {rodMat && (
                                  <span className="flex items-center gap-1 text-mc-muted">
                                    + {rodMat.name[lang]} ({lang === 'pt' ? 'Haste' : 'Rod'})
                                  </span>
                                )}
                                {tipMat && (
                                  <span className="flex items-center gap-1 text-mc-primary">
                                    + {tipMat.name[lang]} ({lang === 'pt' ? 'Ponta' : 'Tip'})
                                  </span>
                                )}
                                {res.build.parts.main?.grade && res.build.parts.main.grade !== 'NONE' && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-mc-gold/20 text-mc-gold border border-mc-gold/40">
                                    {res.build.parts.main.grade}
                                  </span>
                                )}
                                {res.build.parts.main?.starcharge && res.build.parts.main.starcharge > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                    ⭐ {['', 'I', 'II', 'III'][res.build.parts.main.starcharge]}
                                  </span>
                                ) : null}
                              </div>

                              {/* Atributos Chave */}
                              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] font-mono text-mc-muted">
                                {res.stats.meleeDamage > 0 && (
                                  <span className="text-mc-crimson font-bold">
                                    ⚔️ {res.stats.meleeDamage} Dano
                                  </span>
                                )}
                                <span>🛡️ {res.stats.durability} Durab.</span>
                                {res.stats.armor > 0 && (
                                  <span className="text-mc-primary font-bold">
                                    🏰 {res.stats.armor} Armadura
                                  </span>
                                )}
                                {res.stats.harvestSpeed > 1 && (
                                  <span className="text-amber-400">
                                    ⛏️ {res.stats.harvestSpeed} Mineração
                                  </span>
                                )}
                                <span className="text-mc-accent">
                                  ⚡ {res.stats.synergy}% Sinergia
                                </span>
                              </div>

                              {/* Destaque */}
                              {res.summaryHighlights.length > 0 && (
                                <p className="text-[11px] text-mc-accent/90 mt-1 italic">
                                  {res.summaryHighlights[0]}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Botão de Aplicação */}
                          <button
                            onClick={() => handleApply(res)}
                            className="w-full sm:w-auto px-3.5 py-1.5 rounded bg-mc-surfaceHover hover:bg-mc-primary hover:text-mc-bg border border-mc-border text-mc-text font-bold text-xs font-mono transition-colors shadow-sm flex items-center justify-center gap-1.5 shrink-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {lang === 'pt' ? 'Aplicar Build' : 'Apply Build'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="p-3 bg-mc-card/80 border-t border-mc-border flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded text-xs font-medium text-mc-muted hover:text-mc-text transition-colors"
              >
                {lang === 'pt' ? 'Fechar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
