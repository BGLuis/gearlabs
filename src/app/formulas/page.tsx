'use client';

import React, { useMemo } from 'react';
import { useGear } from '@/context/GearContext';
import {
  KNOWN_LIMITATIONS,
  MOD_ELEMENT_EFFECTS,
  PIPELINE_PHASES,
  SILENT_GEAR_COMMIT,
  buildFormulaSections,
  computeWorkedExample,
  sourceLabel,
  sourceUrl,
  type Localized,
} from '@/data/formulas-content';
import { ExternalLink, FlaskConical, ListTree } from 'lucide-react';

type Lang = 'pt' | 'en';

const UI: Record<string, Localized> = {
  title: { pt: 'Como o GearLabs calcula cada atributo', en: 'How GearLabs calculates each attribute' },
  subtitle: {
    pt: 'As fórmulas do Silent Gear 4.2.3, cada uma ligada ao arquivo e à linha do código do mod.',
    en: 'Silent Gear 4.2.3 formulas, each tied to the mod\'s source file and line.',
  },
  index: { pt: 'Nesta página', en: 'On this page' },
  source: { pt: 'Fonte', en: 'Source' },
  unobserved: { pt: 'Lido no código do mod, não observado no jogo', en: 'Read in the mod code, not observed in game' },
  tableTitle: { pt: 'Elemento do mod → efeito', en: 'Mod element → effect' },
  tableIntro: {
    pt: 'Para cada elemento do mod: quais propriedades ele muda e em que etapa do pipeline entra.',
    en: 'For each mod element: which properties it changes and at which pipeline stage it applies.',
  },
  element: { pt: 'Elemento', en: 'Element' },
  affects: { pt: 'Propriedades afetadas', en: 'Affected properties' },
  phase: { pt: 'Etapa do pipeline', en: 'Pipeline stage' },
  section: { pt: 'Seção', en: 'Section' },
  exampleTitle: { pt: 'Exemplo trabalhado: peitoral de liga de cinco metais', en: 'Worked example: five-metal alloy chestplate' },
  exampleIntro: {
    pt: 'Peitoral gravado em um save do jogo (ATM11), calculado agora pelas mesmas funções do simulador. Armadura (armor), passo a passo:',
    en: 'A chestplate recorded from a game save (ATM11), computed now by the same functions as the simulator. Armour (armor), step by step:',
  },
  stepAverage: { pt: 'Média ponderada de armor/chestplate dos materiais', en: 'Weighted average of the materials\' armor/chestplate' },
  stepSynergy: { pt: 'Sinergia da liga', en: 'Alloy synergy' },
  stepAfterSynergy: { pt: 'Depois da sinergia', en: 'After synergy' },
  stepGrade: { pt: 'Depois do grau MAX', en: 'After grade MAX' },
  stepStarcharge: { pt: 'Depois do starcharge', en: 'After starcharge' },
  stepFinal: { pt: 'Armadura final do GearLabs (calculateGearStats)', en: 'GearLabs final armour (calculateGearStats)' },
  stepInGame: { pt: 'Valor gravado pelo jogo', en: 'Value recorded by the game' },
  modelled: { pt: 'modelado', en: 'modelled' },
  rounded: { pt: 'arredondado a 1 casa, como no simulador', en: 'rounded to 1 decimal, as in the simulator' },
  limitsTitle: { pt: 'O que o GearLabs ainda não modela', en: 'What GearLabs does not model yet' },
  noIssue: { pt: 'sem issue', en: 'no issue' },
  commitNote: { pt: 'Commit do Silent Gear lido', en: 'Silent Gear commit read' },
};

const fmt = (n: number, lang: Lang, digits: number) => {
  const text = n.toFixed(digits);
  return lang === 'pt' ? text.replace('.', ',') : text;
};

function Sources({ refs, lang }: { refs: ReturnType<typeof buildFormulaSections>[number]['source']; lang: Lang }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mc-muted">
      <span className="font-mono uppercase tracking-wide">{UI.source[lang]}</span>
      {refs.map((ref) => (
        <a
          key={`${ref.file}:${ref.startLine}`}
          href={sourceUrl(ref)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-mc-forge hover:text-mc-forgeHover underline-offset-2 hover:underline"
        >
          {sourceLabel(ref)}
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      ))}
    </p>
  );
}

function PropertyList({ keys }: { keys: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {keys.map((key) => (
        <code key={key} className="px-1.5 py-0.5 rounded bg-mc-cardSubtle border border-mc-border text-xs text-mc-text">
          {key}
        </code>
      ))}
    </span>
  );
}

export default function FormulasPage() {
  const { lang } = useGear();
  const sections = useMemo(() => buildFormulaSections(), []);
  const example = useMemo(() => computeWorkedExample(), []);
  const sectionTitle = (id: string) => sections.find((s) => s.id === id)?.title[lang] ?? id;
  const phaseLabel = (id: string) => PIPELINE_PHASES.find((p) => p.id === id)?.label[lang] ?? id;

  const index = [
    ...sections.map((s) => ({ id: s.id, label: s.title[lang] })),
    { id: 'mod-effects', label: UI.tableTitle[lang] },
    { id: 'worked-example', label: UI.exampleTitle[lang] },
    ...(KNOWN_LIMITATIONS.length > 0 ? [{ id: 'limitations', label: UI.limitsTitle[lang] }] : []),
  ];

  const indexLinks = (
    <ol className="space-y-1 text-sm">
      {index.map((item, i) => (
        <li key={item.id}>
          <a href={`#${item.id}`} className="flex gap-2 py-1 text-mc-mutedLight hover:text-mc-forge transition-colors">
            <span className="font-mono text-mc-muted w-5 shrink-0">{i + 1}.</span>
            <span>{item.label}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  const steps: Array<{ label: Localized; value: string; code: string }> = [
    { label: UI.stepAverage, value: fmt(example.average, lang, 3), code: 'AVERAGE' },
    { label: UI.stepSynergy, value: fmt(example.synergy, lang, 4), code: 'applySynergyBonus' },
    { label: UI.stepAfterSynergy, value: fmt(example.afterSynergy, lang, 3), code: 'value + |value| × (synergy − 1)' },
    { label: UI.stepGrade, value: fmt(example.afterGrade, lang, 3), code: `value + |value| × ${fmt(example.gradeBonus, lang, 2)}` },
    {
      label: UI.stepStarcharge,
      value: fmt(example.afterStarcharge, lang, 3),
      code: `c = ${example.starchargeLevel} × ${fmt(example.chargingValue, lang, 4)} = ${fmt(example.starchargeLevel * example.chargingValue, lang, 3)}  →  + ${fmt(example.starchargeBonus, lang, 3)}`,
    },
    { label: UI.stepFinal, value: fmt(example.finalArmor, lang, 1), code: `[${UI.modelled[lang]}] ${UI.rounded[lang]}` },
    { label: UI.stepInGame, value: fmt(example.inGameArmor, lang, 4), code: 'armor' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="p-6 bg-mc-surface border border-mc-border rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded bg-mc-primary/20 border border-mc-primary/40 text-mc-primary">
            <FlaskConical className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-mc-text">{UI.title[lang]}</h1>
            <p className="text-xs text-mc-muted font-mono">{UI.subtitle[lang]}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] items-start">
        <aside className="lg:sticky lg:top-20">
          <details className="lg:hidden p-4 bg-mc-surface border border-mc-border rounded-xl">
            <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-mc-text">
              <ListTree className="w-4 h-4 text-mc-forge" aria-hidden="true" />
              {UI.index[lang]}
            </summary>
            <nav aria-label={UI.index[lang]} className="mt-3">{indexLinks}</nav>
          </details>
          <nav aria-label={UI.index[lang]} className="hidden lg:block p-4 bg-mc-surface border border-mc-border rounded-xl">
            <p className="mb-2 text-xs font-mono uppercase tracking-wide text-mc-muted">{UI.index[lang]}</p>
            {indexLinks}
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-20 p-6 bg-mc-surface border border-mc-border rounded-xl shadow-sm space-y-3">
              <h2 className="text-lg font-bold text-mc-text">{s.title[lang]}</h2>
              {s.unobserved && (
                <p className="inline-block px-2 py-0.5 rounded bg-mc-goldMuted border border-mc-gold/40 text-mc-gold text-xs font-mono">
                  {UI.unobserved[lang]}
                </p>
              )}
              <p className="text-sm leading-relaxed text-mc-text">{s.text[lang]}</p>
              <div className="space-y-1.5">
                {s.formula.map((line) => (
                  <code key={line} className="block overflow-x-auto whitespace-pre px-3 py-2 rounded bg-mc-cardSubtle border border-mc-border text-xs text-mc-primary">
                    {line}
                  </code>
                ))}
              </div>
              <Sources refs={s.source} lang={lang} />
            </section>
          ))}

          <section id="mod-effects" className="scroll-mt-20 p-6 bg-mc-surface border border-mc-border rounded-xl shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-mc-text">{UI.tableTitle[lang]}</h2>
            <p className="text-sm text-mc-mutedLight">{UI.tableIntro[lang]}</p>
            <table className="hidden md:table w-full text-sm text-left border-collapse">
              <thead>
                <tr className="text-xs font-mono uppercase tracking-wide text-mc-muted border-b border-mc-border">
                  <th scope="col" className="py-2 pr-3">{UI.element[lang]}</th>
                  <th scope="col" className="py-2 pr-3">{UI.affects[lang]}</th>
                  <th scope="col" className="py-2 pr-3">{UI.phase[lang]}</th>
                  <th scope="col" className="py-2">{UI.section[lang]}</th>
                </tr>
              </thead>
              <tbody>
                {MOD_ELEMENT_EFFECTS.map((row) => (
                  <tr key={row.id} className="align-top border-b border-mc-border/60">
                    <th scope="row" className="py-3 pr-3 font-medium text-mc-text">{row.element[lang]}</th>
                    <td className="py-3 pr-3"><PropertyList keys={row.affects} /></td>
                    <td className="py-3 pr-3 text-mc-mutedLight">{phaseLabel(row.phase)}</td>
                    <td className="py-3">
                      <a href={`#${row.sectionId}`} className="text-mc-forge hover:underline">{sectionTitle(row.sectionId)}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="md:hidden space-y-3">
              {MOD_ELEMENT_EFFECTS.map((row) => (
                <li key={row.id} className="p-4 rounded-lg bg-mc-cardSubtle border border-mc-border space-y-2">
                  <p className="font-medium text-mc-text">{row.element[lang]}</p>
                  <PropertyList keys={row.affects} />
                  <p className="text-xs text-mc-mutedLight">{UI.phase[lang]}: {phaseLabel(row.phase)}</p>
                  <a href={`#${row.sectionId}`} className="text-xs text-mc-forge hover:underline">{sectionTitle(row.sectionId)}</a>
                </li>
              ))}
            </ul>
          </section>

          <section id="worked-example" className="scroll-mt-20 p-6 bg-mc-surface border border-mc-forge/40 rounded-xl shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-mc-text">{UI.exampleTitle[lang]}</h2>
            <p className="text-sm text-mc-mutedLight">{UI.exampleIntro[lang]}</p>
            <ol className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between p-3 rounded bg-mc-cardSubtle border border-mc-border">
                  <span className="text-sm text-mc-text">{step.label[lang]}</span>
                  <span className="flex flex-wrap items-baseline gap-x-3">
                    <code className="text-xs text-mc-muted">{step.code}</code>
                    <span className="font-mono text-base font-bold text-mc-forge">{step.value}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {KNOWN_LIMITATIONS.length > 0 && (
            <section id="limitations" className="scroll-mt-20 p-6 bg-mc-surface border border-mc-border rounded-xl shadow-sm space-y-3">
              <h2 className="text-lg font-bold text-mc-text">{UI.limitsTitle[lang]}</h2>
              <ul className="space-y-2">
                {KNOWN_LIMITATIONS.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-baseline gap-2 text-sm text-mc-text">
                    <span>{l.text[lang]}</span>
                    {l.issue !== undefined ? (
                      <a
                        href={`https://github.com/BGLuis/gearlabs/issues/${l.issue}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-mc-forge hover:underline"
                      >
                        #{l.issue}
                      </a>
                    ) : (
                      <span className="font-mono text-xs text-mc-muted">({UI.noIssue[lang]})</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs text-mc-muted font-mono">
            {UI.commitNote[lang]}: <code>{SILENT_GEAR_COMMIT.slice(0, 7)}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
