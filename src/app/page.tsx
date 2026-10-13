'use client';

import React from 'react';
import { useGear } from '@/context/GearContext';
import { GearTypeSidebar } from '@/components/GearTypeSidebar';
import { BuildQuickStats } from '@/components/BuildQuickStats';
import { GearCanvas } from '@/components/GearCanvas';
import { SlotPicker } from '@/components/SlotPicker';
import { InlineOptimizerCard } from '@/components/InlineOptimizerCard';
import { StatsPanel } from '@/components/StatsPanel';

export default function HomePage() {
  const { catalog, build, catalogError, statsError, lang } = useGear();

  const currentGearType = catalog.gearTypes[build.gearTypeId] || Object.values(catalog.gearTypes)[0];
  const requiredSlots = currentGearType?.requiredSlots || [];
  const optionalSlots = currentGearType?.optionalSlots || [];
  const filledRequiredCount = requiredSlots.filter((s) => !!build.parts[s]?.materialId).length;

  return (
    <div className="space-y-5">
      {catalogError && (
        <div
          role="alert"
          className="p-3 rounded-lg border border-mc-crimson/60 bg-mc-crimson/10 text-xs font-mono text-mc-crimson"
        >
          {lang === 'pt'
            ? `Não foi possível carregar o catálogo: ${catalogError}. Exibindo o catálogo embutido, que está incompleto.`
            : `Could not load the catalog: ${catalogError}. Showing the built-in catalog, which is incomplete.`}
        </div>
      )}

      {statsError && (
        <div
          role="alert"
          className="p-3 rounded-lg border border-mc-crimson/60 bg-mc-crimson/10 text-xs font-mono text-mc-crimson"
        >
          {lang === 'pt' ? `Montagem inválida: ${statsError}` : `Invalid build: ${statsError}`}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Coluna Esquerda: Navegador de Categorias e Equipamentos (3 cols) */}
        <aside className="lg:col-span-3">
          <GearTypeSidebar />
        </aside>

        {/* Coluna Central: KPIs, Canvas, Slots e Otimizador (6 cols) */}
        <section className="lg:col-span-6 space-y-5">
          <BuildQuickStats />

          <GearCanvas size={128} />

          {/* Seção de Peças */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-semibold text-sm text-mc-text">
                {lang === 'pt' ? 'Peças' : 'Parts'}
              </h3>
              <span className="text-xs font-mono text-mc-mutedLight">
                {lang === 'pt'
                  ? `${filledRequiredCount} obrigatórias preenchidas · ${optionalSlots.length} opcionais`
                  : `${filledRequiredCount} required filled · ${optionalSlots.length} optional`}
              </span>
            </div>

            {/* Slots Obrigatórios */}
            {requiredSlots.map((slot) => (
              <SlotPicker key={slot} slot={slot} isRequired={true} />
            ))}

            {/* Slots Opcionais */}
            {optionalSlots.map((slot) => (
              <SlotPicker key={slot} slot={slot} isRequired={false} />
            ))}
          </div>

          {/* Card do Otimizador Integrado com Inventário */}
          <InlineOptimizerCard />
        </section>

        {/* Coluna Direita: Atributos Calculados & Traits Ativos (3 cols) */}
        <aside className="lg:col-span-3 space-y-5">
          <StatsPanel />
        </aside>
      </div>
    </div>
  );
}
