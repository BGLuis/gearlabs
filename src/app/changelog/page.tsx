'use client';

import React from 'react';
import { useGear } from '@/context/GearContext';
import { History, Sparkles, CheckCircle2, Calendar, GitCommit } from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  title: { pt: string; en: string };
  highlights: Array<{ pt: string; en: string }>;
  tag: string;
}

const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: 'v1.0.0',
    date: '2026-10-07',
    title: {
      pt: 'Lançamento Inicial do GearLabs',
      en: 'Initial Release of GearLabs',
    },
    tag: 'Release Oficial',
    highlights: [
      {
        pt: 'Simulador Interativo completo: montagem modular slot-a-slot de armas, ferramentas e armaduras.',
        en: 'Interactive Gear Simulator: slot-by-slot modular assembly of weapons, tools, and armor.',
      },
      {
        pt: 'Motor de cálculo fidedigno: cálculo exato de sinergia entre materiais, multiplicadores de grau (E a MAX) e agregação de traits.',
        en: 'Accurate calculation engine: precise synergy calculation, material grade multipliers (E to MAX), and trait level aggregation.',
      },
      {
        pt: 'Algoritmo de Otimização Combinatória ("Best Build Finder"): sugere as 3 melhores combinações de peças a partir dos materiais marcados no seu inventário.',
        en: 'Combinatorial Optimization Algorithm ("Best Build Finder"): suggests top 3 builds using only materials checked in your inventory.',
      },
      {
        pt: 'Renderizador 2D em Canvas pixel-art: composição em tempo real com tinting hexadecimal das cores oficiais de cada material.',
        en: '2D Pixel-art Canvas compositor: real-time layered rendering with hex color tinting from official material definitions.',
      },
      {
        pt: 'Catálogo de Materiais & Checklist de Inventário: busca, ordenação por atributos e seleção de materiais possuídos com salvamento local.',
        en: 'Materials Catalog & Inventory Checklist: search, sorting by stats, and inventory checklist saved locally.',
      },
      {
        pt: 'Compartilhamento por Link Compactado: gera URLs curtas usando compressão LZ-String que recriam 100% da sua build sem precisar de login.',
        en: 'Compressed Link Sharing: generates short URLs using LZ-String compression that restore 100% of your build without login.',
      },
      {
        pt: 'Pipeline de Extração Direta do GitHub: script automatizado para extrair e normalizar dados diretamente das branches oficiais de 1.16 a 1.21+ do Silent Gear.',
        en: 'Direct GitHub Extraction Pipeline: automated script extracting data directly from official Silent Gear branches 1.16 to 1.21+.',
      },
      {
        pt: 'Suporte Bilíngue Nativo: interface completa em Português do Brasil (PT-BR) e Inglês (EN).',
        en: 'Native Bilingual Support: fully localized interface in Brazilian Portuguese (PT-BR) and English (EN).',
      },
    ],
  },
];

export default function ChangelogPage() {
  const { lang } = useGear();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="p-6 bg-mc-surface border border-mc-border rounded-xl shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded bg-mc-primary/20 border border-mc-primary/40 text-mc-primary">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-mc-text">
              {lang === 'pt' ? 'Histórico de Atualizações do GearLabs' : 'GearLabs Changelog & Releases'}
            </h2>
            <p className="text-xs text-mc-muted font-mono">
              {lang === 'pt'
                ? 'Acompanhe as versões, novidades e melhorias implementadas na plataforma.'
                : 'Track versions, features, and improvements implemented on the platform.'}
            </p>
          </div>
        </div>
      </div>

      {/* Linha do Tempo de Versões */}
      <div className="space-y-6">
        {CHANGELOG_DATA.map((entry) => (
          <div
            key={entry.version}
            className="p-6 bg-mc-surface border border-mc-border rounded-xl shadow-sm relative overflow-hidden"
          >
            {/* Header da Versão */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mc-border/60 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold font-mono text-mc-primary">
                  {entry.version}
                </span>
                <span className="px-2 py-0.5 rounded bg-mc-accent/20 border border-mc-accent/40 text-mc-accent text-xs font-mono font-bold">
                  {entry.tag}
                </span>
                <h3 className="font-bold text-sm text-mc-text">
                  {entry.title[lang]}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-mc-muted font-mono">
                <Calendar className="w-3.5 h-3.5" />
                {entry.date}
              </div>
            </div>

            {/* Lista de Novidades */}
            <div className="space-y-2.5">
              {entry.highlights.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-mc-text">
                  <CheckCircle2 className="w-4 h-4 text-mc-accent shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{item[lang]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
