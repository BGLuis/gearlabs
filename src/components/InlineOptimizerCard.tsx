'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGear } from '@/context/GearContext';
import {
  Grade,
  OptimizationGoal,
  OptimizedBuildResult,
  StarchargeLevel,
} from '@/types/silentgear';
import {
  createDebouncedTask,
  createLatestRequestTracker,
  OptimizerSearchMessage,
  OptimizerSearchReply,
  runOptimizerSearch,
} from '@/lib/optimizer-search';
import { Sparkles, Swords, Zap, Heart, Shield, Pickaxe, Scale, Check, ArrowRight } from 'lucide-react';

export function InlineOptimizerCard() {
  const { catalog, build, inventory, loadBuild, lang } = useGear();
  const [goal, setGoal] = useState<OptimizationGoal>('max_damage');
  const [grade, setGrade] = useState<Grade>('S');
  const [starcharge, setStarcharge] = useState<StarchargeLevel>(2);
  const [allowAlloys, setAllowAlloys] = useState(true);
  const [results, setResults] = useState<OptimizedBuildResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);

  const [searchTracker] = useState(createLatestRequestTracker);
  const workerRef = useRef<Worker | null>(null);

  const currentGearType = catalog.gearTypes[build.gearTypeId];
  const isArmor = currentGearType?.category === 'armor';
  const isTool = currentGearType?.category === 'tool';

  const goals: Array<{
    id: OptimizationGoal;
    label: { pt: string; en: string };
    icon: React.ReactNode;
  }> = [
    {
      id: 'max_damage',
      label: { pt: 'Dano máx.', en: 'Max Damage' },
      icon: <Swords className="w-3.5 h-3.5" />,
    },
    {
      id: 'max_dps',
      label: { pt: 'DPS', en: 'DPS' },
      icon: <Zap className="w-3.5 h-3.5" />,
    },
    {
      id: 'max_durability',
      label: { pt: 'Durabilidade', en: 'Durability' },
      icon: <Heart className="w-3.5 h-3.5" />,
    },
    {
      id: 'balanced',
      label: { pt: 'Equilíbrio', en: 'Balanced' },
      icon: <Scale className="w-3.5 h-3.5" />,
    },
    {
      id: 'max_protection',
      label: { pt: 'Proteção', en: 'Protection' },
      icon: <Shield className="w-3.5 h-3.5" />,
    },
    {
      id: 'max_harvest',
      label: { pt: 'Mineração', en: 'Harvest' },
      icon: <Pickaxe className="w-3.5 h-3.5" />,
    },
  ];

  const filteredGoals = goals.filter((g) => {
    if (isArmor) return ['max_protection', 'max_durability', 'balanced'].includes(g.id);
    if (isTool) return ['max_harvest', 'max_durability', 'max_damage', 'balanced'].includes(g.id);
    return ['max_damage', 'max_dps', 'max_durability', 'balanced'].includes(g.id);
  });

  const availableList = React.useMemo(() => Array.from(inventory), [inventory]);

  const executeSearch = () => {
    setIsSearching(true);
    const message: OptimizerSearchMessage = {
      id: searchTracker.next(),
      request: {
        gearTypeId: build.gearTypeId,
        availableMaterials: availableList,
        goal,
        grade,
        starcharge,
        allowAlloys,
      },
      catalog,
      topN: 3,
    };

    if (typeof Worker === 'undefined') {
      const reply = runOptimizerSearch(message);
      if (!('error' in reply)) {
        setResults(reply.results);
      }
      setIsSearching(false);
      return;
    }

    if (!workerRef.current) {
      const worker = new Worker(new URL('../workers/optimizer.worker.ts', import.meta.url));
      worker.onmessage = (e: MessageEvent<OptimizerSearchReply>) => {
        if (!searchTracker.isLatest(e.data.id)) return;
        if (!('error' in e.data)) {
          setResults(e.data.results);
        }
        setIsSearching(false);
      };
      worker.onerror = () => {
        setIsSearching(false);
      };
      workerRef.current = worker;
    }
    workerRef.current.postMessage(message);
  };

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const handleApply = (res: OptimizedBuildResult, idx: number) => {
    loadBuild(res.build);
    setAppliedIndex(idx);
    setTimeout(() => setAppliedIndex(null), 2500);
  };

  return (
    <div className="p-4 bg-mc-surface border border-mc-border rounded-[10px] space-y-3.5 shadow-sm">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-mc-forge" />
            <h3 className="font-semibold text-sm text-mc-text">
              {lang === 'pt' ? 'Otimizar com seu inventário' : 'Optimize with your inventory'}
            </h3>
          </div>
          <p className="text-xs text-mc-mutedLight mt-0.5">
            {lang === 'pt'
              ? `Busca as melhores combinações usando só os ${inventory.size} materiais marcados como seus.`
              : `Finds the best combinations using only your ${inventory.size} marked inventory materials.`}
          </p>
        </div>
      </div>

      {/* Seletor de Metas Rápidas */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-mono text-mc-mutedLight mr-1">
          {lang === 'pt' ? 'Meta:' : 'Goal:'}
        </span>
        {filteredGoals.map((g) => {
          const isSelected = goal === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setGoal(g.id)}
              className={`px-2.5 py-1 rounded-[6px] text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isSelected
                  ? 'bg-mc-card border border-mc-forge text-mc-forge shadow-sm'
                  : 'bg-[#121418] hover:bg-mc-card border border-mc-border text-mc-mutedLight hover:text-mc-text'
              }`}
            >
              {g.icon}
              {g.label[lang]}
            </button>
          );
        })}
      </div>

      {/* Linha de Filtros & Ação */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-mc-border/60 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          {/* Grau até */}
          <div className="flex items-center gap-1.5">
            <span className="text-mc-mutedLight">{lang === 'pt' ? 'Grau até' : 'Max Grade'}:</span>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value as Grade)}
              className="bg-[#121418] border border-mc-border rounded-[4px] px-1.5 py-0.5 text-mc-gold font-bold focus:outline-none"
            >
              {(['NONE', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'MAX'] as Grade[]).map((gr) => (
                <option key={gr} value={gr}>
                  {gr}
                </option>
              ))}
            </select>
          </div>

          {/* Carga */}
          <div className="flex items-center gap-1.5">
            <span className="text-mc-mutedLight">{lang === 'pt' ? 'Carga' : 'Charge'}:</span>
            <select
              value={starcharge}
              onChange={(e) => setStarcharge(Number(e.target.value) as StarchargeLevel)}
              className="bg-[#121418] border border-mc-border rounded-[4px] px-1.5 py-0.5 text-cyan-400 font-bold focus:outline-none"
            >
              {[0, 1, 2, 3].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl === 0 ? '0' : lvl === 1 ? 'I' : lvl === 2 ? 'II' : 'III'}
                </option>
              ))}
            </select>
          </div>

          {/* Ligas Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer text-mc-mutedLight hover:text-mc-text">
            <input
              type="checkbox"
              checked={allowAlloys}
              onChange={(e) => setAllowAlloys(e.target.checked)}
              className="rounded bg-[#121418] border-mc-border text-mc-forge focus:ring-0"
            />
            <span>{lang === 'pt' ? 'Ligas' : 'Alloys'}</span>
          </label>
        </div>

        {/* Botão de Pesquisa */}
        <button
          onClick={executeSearch}
          disabled={isSearching}
          className="px-3 py-1.5 rounded-[6px] bg-mc-forge hover:bg-mc-forgeHover text-[#0E0F11] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isSearching
            ? (lang === 'pt' ? 'Buscando...' : 'Searching...')
            : (lang === 'pt' ? 'Encontrar melhores builds' : 'Find Best Builds')}
        </button>
      </div>

      {/* Resultados Sugeridos */}
      {results.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-mc-border/80">
          <div className="text-[11px] font-mono text-mc-mutedLight uppercase tracking-wider">
            {lang === 'pt' ? 'Melhores Combinações Encontradas' : 'Top Suggested Builds'}
          </div>

          <div className="space-y-2">
            {results.map((res, idx) => {
              const mainMat = catalog.materials[res.build.parts.main?.materialId || ''];
              const rodMat = res.build.parts.rod ? catalog.materials[res.build.parts.rod.materialId || ''] : null;

              return (
                <div
                  key={idx}
                  className="p-3 bg-[#121418] border border-mc-border hover:border-mc-borderHover rounded-[8px] flex flex-wrap items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-[4px] bg-mc-card border border-mc-border text-[11px] font-mono font-bold flex items-center justify-center text-mc-forge">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-sm text-mc-text">
                        {mainMat?.name[lang] || mainMat?.name.en || 'Custom'}
                      </span>
                      {rodMat && (
                        <span className="text-xs text-mc-mutedLight font-mono">
                          + {rodMat.name[lang] || rodMat.name.en}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono text-mc-mutedLight">
                      {isArmor ? (
                        <>
                          <span>Armadura: <b className="text-mc-text">{res.stats.armor.toFixed(1)}</b></span>
                          <span>Tenacidade: <b className="text-mc-text">{res.stats.armorToughness.toFixed(1)}</b></span>
                        </>
                      ) : (
                        <>
                          <span>Dano: <b className="text-mc-text">{res.stats.meleeDamage.toFixed(1)}</b></span>
                          <span>DPS: <b className="text-mc-text">{res.stats.dps.toFixed(1)}</b></span>
                        </>
                      )}
                      <span>Durab: <b className="text-mc-text">{res.stats.durability.toLocaleString()}</b></span>
                      <span className="text-mc-gold font-semibold">{res.stats.synergy}% sinergia</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleApply(res, idx)}
                    className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      appliedIndex === idx
                        ? 'bg-mc-positive text-[#0E0F11] font-bold shadow-sm'
                        : 'bg-mc-card hover:bg-mc-surface border border-mc-border hover:border-mc-forge text-mc-text hover:text-mc-forge'
                    }`}
                  >
                    {appliedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        {lang === 'pt' ? 'Aplicada!' : 'Applied!'}
                      </>
                    ) : (
                      <>
                        {lang === 'pt' ? 'Aplicar build' : 'Apply build'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
