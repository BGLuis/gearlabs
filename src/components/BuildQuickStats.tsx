'use client';

import React from 'react';
import { useGear } from '@/context/GearContext';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { GRADE_MULTIPLIERS } from '@/types/silentgear';

export function BuildQuickStats() {
  const { catalog, build, stats, lang } = useGear();

  const gearType = catalog.gearTypes[build.gearTypeId] || Object.values(catalog.gearTypes)[0];
  if (!gearType) return null;

  const mainPart = build.parts.main;
  const mainMaterial = mainPart ? catalog.materials[mainPart.materialId] : null;

  // Resolução do nome do equipamento
  const gearTypeName = gearType.name[lang] || gearType.name.en || gearType.id;
  const materialName = mainMaterial ? (mainMaterial.name[lang] || mainMaterial.name.en) : null;

  let displayName = gearTypeName;
  if (materialName) {
    displayName = lang === 'pt' ? `${gearTypeName} de ${materialName}` : `${materialName} ${gearTypeName}`;
  }

  // Validação de requisitos
  const requiredSlots = gearType.requiredSlots || [];
  const optionalSlots = gearType.optionalSlots || [];
  const totalSlotsCount = requiredSlots.length + optionalSlots.length;
  const filledSlots = Object.keys(build.parts).filter((k) => !!build.parts[k as keyof typeof build.parts]?.materialId);
  const isValid = requiredSlots.every((s) => !!build.parts[s]?.materialId);

  // Grau da parte principal
  const mainGrade = mainPart?.grade && mainPart.grade !== 'NONE' ? mainPart.grade : 'padrão';

  // Métricas de acordo com a categoria
  const isArmor = gearType.category === 'armor';
  const isTool = gearType.category === 'tool';

  // Cálculo de delta ilustrativo baseado no grau da lâmina/peça principal
  const gradeBonus = mainPart?.grade ? GRADE_MULTIPLIERS[mainPart.grade] || 0 : 0;

  return (
    <div className="space-y-4">
      {/* Header do Equipamento & Status */}
      <div className="p-4 bg-mc-surface border border-mc-border rounded-[10px] space-y-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-mono uppercase tracking-wider text-mc-mutedLight">
            {gearTypeName} · {gearType.category}
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              isValid
                ? 'bg-mc-positiveMuted border-mc-positive/40 text-mc-positive'
                : 'bg-mc-negativeMuted border-mc-negative/40 text-mc-negative'
            }`}
          >
            {isValid ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lang === 'pt' ? 'Montagem válida' : 'Valid Build'}
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                {lang === 'pt' ? 'Montagem incompleta' : 'Incomplete Build'}
              </>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-pixel text-2xl font-bold tracking-wide text-mc-text">
            {displayName}
          </h2>
          <p className="text-xs text-mc-mutedLight mt-0.5 font-mono">
            {filledSlots.length} de {totalSlotsCount} {lang === 'pt' ? 'peças' : 'parts'}
            {mainPart?.grade && mainPart.grade !== 'NONE'
              ? ` · ${lang === 'pt' ? `grau ${mainGrade} na parte principal` : `grade ${mainGrade} on main part`}`
              : ''}
          </p>
        </div>
      </div>

      {/* Grid de 3 KPIs Instantâneos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* KPI 1 */}
        <div className="p-3.5 bg-mc-card border border-mc-border rounded-[10px] space-y-1">
          <div className="text-xs font-medium text-mc-mutedLight">
            {isArmor
              ? (lang === 'pt' ? 'Pontos de Armadura' : 'Armor Points')
              : (lang === 'pt' ? 'Dano por golpe' : 'Attack Damage')}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-mc-text">
              {stats ? (isArmor ? stats.armor.toFixed(1) : stats.meleeDamage.toFixed(1)) : '—'}
            </span>
            {stats && gradeBonus > 0 && (
              <span className="text-xs font-mono font-semibold text-mc-positive">
                +{((isArmor ? stats.armor : stats.meleeDamage) * (gradeBonus / (1 + gradeBonus))).toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-3.5 bg-mc-card border border-mc-border rounded-[10px] space-y-1">
          <div className="text-xs font-medium text-mc-mutedLight">
            {isArmor
              ? (lang === 'pt' ? 'Tenacidade' : 'Toughness')
              : isTool
              ? (lang === 'pt' ? 'Velocidade Mineração' : 'Harvest Speed')
              : (lang === 'pt' ? 'DPS estimado' : 'Estimated DPS')}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-mc-text">
              {stats
                ? (isArmor
                    ? stats.armorToughness.toFixed(1)
                    : isTool
                    ? stats.harvestSpeed.toFixed(1)
                    : stats.dps.toFixed(1))
                : '—'}
            </span>
            {stats && gradeBonus > 0 && !isArmor && (
              <span className="text-xs font-mono font-semibold text-mc-positive">
                +{((isTool ? stats.harvestSpeed : stats.dps) * (gradeBonus / (1 + gradeBonus))).toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-3.5 bg-mc-card border border-mc-border rounded-[10px] space-y-1">
          <div className="text-xs font-medium text-mc-mutedLight">
            {lang === 'pt' ? 'Durabilidade' : 'Durability'}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-mc-text">
              {stats ? stats.durability.toLocaleString() : '—'}
            </span>
            {stats && gradeBonus > 0 && (
              <span className="text-xs font-mono font-semibold text-mc-positive">
                +{Math.round(stats.durability * (gradeBonus / (1 + gradeBonus)))}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
