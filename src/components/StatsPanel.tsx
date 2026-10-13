'use client';

import React from 'react';
import { useGear } from '@/context/GearContext';
import { Sparkles, Shield, Swords, Zap, Activity } from 'lucide-react';
import { GRADE_MULTIPLIERS } from '@/types/silentgear';

export function StatsPanel() {
  const { catalog, build, stats, lang } = useGear();

  const gearType = catalog.gearTypes[build.gearTypeId];
  const isArmor = gearType?.category === 'armor';
  const isTool = gearType?.category === 'tool';

  const mainPart = build.parts.main;
  const gradeBonus = mainPart?.grade ? GRADE_MULTIPLIERS[mainPart.grade] || 0 : 0;

  if (!stats) {
    return (
      <div className="p-4 bg-mc-surface border border-mc-border rounded-[10px] text-center text-xs text-mc-mutedLight font-mono">
        {lang === 'pt' ? 'Atributos não disponíveis.' : 'Stats not available.'}
      </div>
    );
  }

  // Parâmetros de escala relativos ao teto do modpack
  const maxBenchmarks = {
    damage: 60,
    speed: 3.5,
    dps: 120,
    durability: 12000,
    armor: 36,
    toughness: 18,
    harvestSpeed: 30,
    enchantability: 25,
    reach: 4.5,
  };

  const getPercent = (value: number, max: number) => {
    if (!value || isNaN(value)) return 0;
    return Math.min(100, Math.max(4, Math.round((value / max) * 100)));
  };

  // Lista de atributos a exibir conforme a categoria do equipamento
  const statRows = isArmor
    ? [
        {
          id: 'armor',
          label: lang === 'pt' ? 'Armadura' : 'Armor',
          value: stats.armor.toFixed(1),
          delta: gradeBonus > 0 ? `+${(stats.armor * (gradeBonus / (1 + gradeBonus))).toFixed(1)}` : null,
          percent: getPercent(stats.armor, maxBenchmarks.armor),
          color: 'bg-mc-diamond',
        },
        {
          id: 'toughness',
          label: lang === 'pt' ? 'Tenacidade' : 'Armor Toughness',
          value: stats.armorToughness.toFixed(1),
          delta: null,
          percent: getPercent(stats.armorToughness, maxBenchmarks.toughness),
          color: 'bg-mc-forge',
        },
        {
          id: 'magicArmor',
          label: lang === 'pt' ? 'Armadura Mágica' : 'Magic Armor',
          value: stats.magicArmor.toFixed(1),
          delta: null,
          percent: getPercent(stats.magicArmor, 20),
          color: 'bg-purple-400',
        },
        {
          id: 'durability',
          label: lang === 'pt' ? 'Durabilidade' : 'Durability',
          value: stats.durability.toLocaleString(),
          delta: gradeBonus > 0 ? `+${Math.round(stats.durability * (gradeBonus / (1 + gradeBonus)))}` : null,
          percent: getPercent(stats.durability, maxBenchmarks.durability),
          color: 'bg-mc-positive',
        },
      ]
    : [
        {
          id: 'meleeDamage',
          label: lang === 'pt' ? 'Dano por golpe' : 'Attack Damage',
          value: stats.meleeDamage.toFixed(1),
          delta: gradeBonus > 0 ? `+${(stats.meleeDamage * (gradeBonus / (1 + gradeBonus))).toFixed(1)}` : null,
          percent: getPercent(stats.meleeDamage, maxBenchmarks.damage),
          color: 'bg-mc-forge',
        },
        {
          id: 'attackSpeed',
          label: lang === 'pt' ? 'Velocidade de ataque' : 'Attack Speed',
          value: stats.attackSpeed.toFixed(2),
          delta: null,
          percent: getPercent(stats.attackSpeed, maxBenchmarks.speed),
          color: 'bg-cyan-400',
        },
        {
          id: 'dps',
          label: lang === 'pt' ? 'DPS estimado' : 'Estimated DPS',
          value: stats.dps.toFixed(1),
          delta: gradeBonus > 0 ? `+${(stats.dps * (gradeBonus / (1 + gradeBonus))).toFixed(1)}` : null,
          percent: getPercent(stats.dps, maxBenchmarks.dps),
          color: 'bg-mc-gold',
        },
        {
          id: 'durability',
          label: lang === 'pt' ? 'Durabilidade' : 'Durability',
          value: stats.durability.toLocaleString(),
          delta: gradeBonus > 0 ? `+${Math.round(stats.durability * (gradeBonus / (1 + gradeBonus)))}` : null,
          percent: getPercent(stats.durability, maxBenchmarks.durability),
          color: 'bg-mc-positive',
        },
        ...(isTool
          ? [
              {
                id: 'harvestSpeed',
                label: lang === 'pt' ? 'Velocidade de Mineração' : 'Harvest Speed',
                value: stats.harvestSpeed.toFixed(1),
                delta: null,
                percent: getPercent(stats.harvestSpeed, maxBenchmarks.harvestSpeed),
                color: 'bg-amber-400',
              },
              {
                id: 'harvestTier',
                label: lang === 'pt' ? 'Tier de Mineração' : 'Harvest Tier',
                value: stats.harvestTier,
                delta: null,
                percent: getPercent(stats.harvestTierLevel || 2, 6),
                color: 'bg-emerald-400',
              },
            ]
          : []),
      ];

  return (
    <div className="space-y-5">
      {/* Card de Atributos */}
      <div className="p-4 bg-mc-surface border border-mc-border rounded-[10px] space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-mc-border/60">
          <h3 className="font-semibold text-sm text-mc-text flex items-center gap-2">
            <Activity className="w-4 h-4 text-mc-forge" />
            {lang === 'pt' ? 'Atributos' : 'Attributes'}
          </h3>

          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-[4px] bg-mc-goldMuted border border-mc-gold/40 text-mc-gold">
            {lang === 'pt' ? 'Sinergia' : 'Synergy'} {stats.synergy}%
          </span>
        </div>

        {/* Barras de Atributos */}
        <div className="space-y-3">
          {statRows.map((row) => (
            <div key={row.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-mc-mutedLight">{row.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-mc-text">{row.value}</span>
                  {row.delta && (
                    <span className="text-[11px] font-semibold text-mc-positive">
                      {row.delta}
                    </span>
                  )}
                </div>
              </div>

              {/* Barra de Progresso Relativa */}
              <div className="w-full h-1.5 bg-[#121418] rounded-full overflow-hidden border border-mc-border/40">
                <div
                  className={`h-full ${row.color} rounded-full transition-all duration-300`}
                  style={{ width: `${row.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-mc-mutedLight/70 font-mono pt-1">
          {lang === 'pt'
            ? 'Barras relativas ao melhor valor possível nesta versão/modpack.'
            : 'Meters relative to the highest possible value in this version/modpack.'}
        </p>
      </div>

      {/* Card de Traits Ativos */}
      <div className="p-4 bg-mc-surface border border-mc-border rounded-[10px] space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-mc-border/60">
          <h3 className="font-semibold text-sm text-mc-text flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-mc-gold" />
            {lang === 'pt' ? 'Traits ativos' : 'Active Traits'}
          </h3>

          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-[4px] bg-mc-card border border-mc-border text-mc-text">
            {stats.traits.length}
          </span>
        </div>

        {stats.traits.length === 0 ? (
          <div className="text-xs text-mc-mutedLight font-mono py-2 text-center">
            {lang === 'pt' ? 'Nenhum trait ativo no momento.' : 'No active traits currently.'}
          </div>
        ) : (
          <div className="space-y-2">
            {stats.traits.map((trait) => (
              <div
                key={trait.id}
                className="p-2.5 bg-[#121418] border border-mc-border rounded-[8px] space-y-1 hover:border-mc-borderHover transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-mc-text">
                    {trait.name[lang] || trait.name.en || trait.id}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-mc-forgeMuted border border-mc-forge/40 text-mc-forge">
                    {lang === 'pt' ? `Nv ${trait.level}` : `Lv ${trait.level}`}
                  </span>
                </div>

                <p className="text-[11px] text-mc-mutedLight leading-relaxed">
                  {trait.description[lang] || trait.description.en}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
