'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useGear } from '@/context/GearContext';
import { Layers, Check, X, Info } from 'lucide-react';

export function AddonSelector() {
  const { addons, toggleAddon, setAddonEnabled, lang } = useGear();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fechar no Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const totalCount = addons.length;
  const activeCount = addons.filter((a) => a.enabled).length;

  const t = {
    pt: {
      buttonTitle: 'Gerenciar camadas de addons e modpacks',
      buttonLabel: `Addons (${activeCount}/${totalCount})`,
      noAddons: 'Sem addons (Vanilla)',
      title: 'Camadas de Addons',
      subtitle: 'Ative ou desative addons para simular o comportamento exato de mods e modpacks.',
      enableAll: 'Ativar Todos',
      vanillaOnly: 'Apenas Vanilla',
      activeStatus: 'Ativo',
      inactiveStatus: 'Desativado',
    },
    en: {
      buttonTitle: 'Manage addon and modpack layers',
      buttonLabel: `Addons (${activeCount}/${totalCount})`,
      noAddons: 'No addons (Vanilla)',
      title: 'Addon Layers',
      subtitle: 'Enable or disable addons to simulate the exact behavior of mods and modpacks.',
      enableAll: 'Enable All',
      vanillaOnly: 'Vanilla Only',
      activeStatus: 'Active',
      inactiveStatus: 'Disabled',
    },
  }[lang];

  if (totalCount === 0) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-mc-card/50 border border-mc-border text-xs text-mc-muted opacity-60 font-mono cursor-not-allowed select-none"
        title={t.noAddons}
      >
        <Layers className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t.noAddons}</span>
        <span className="sm:hidden">Vanilla</span>
      </div>
    );
  }

  const allActive = activeCount === totalCount;

  return (
    <div className="relative" ref={containerRef}>
      {/* Botão de Disparo */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={t.buttonTitle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-mono font-medium transition-colors ${
          allActive
            ? 'bg-mc-card hover:bg-mc-surfaceHover border-mc-border text-mc-text'
            : activeCount > 0
            ? 'bg-mc-gold/10 hover:bg-mc-gold/20 border-mc-gold/40 text-mc-gold font-bold'
            : 'bg-mc-crimson/10 hover:bg-mc-crimson/20 border-mc-crimson/40 text-mc-crimson'
        }`}
      >
        <Layers className={`w-3.5 h-3.5 ${allActive ? 'text-mc-primary' : activeCount > 0 ? 'text-mc-gold' : 'text-mc-crimson'}`} />
        <span>{t.buttonLabel}</span>
      </button>

      {/* Popover / Menu Dropdown */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={t.title}
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-mc-surface border border-mc-border rounded-xl shadow-2xl z-50 p-4 space-y-3 font-sans animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-mc-border/60 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-mc-text flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-mc-primary" />
                {t.title}
              </h3>
              <p className="text-[11px] text-mc-muted leading-tight mt-0.5">
                {t.subtitle}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-mc-muted hover:text-mc-text hover:bg-mc-card transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Lista de Addons */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {addons.map((addon, index) => {
              const isEnabled = addon.enabled;

              return (
                <div
                  key={addon.id}
                  onClick={() => toggleAddon(addon.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer select-none flex items-start gap-3 ${
                    isEnabled
                      ? 'bg-mc-card/80 border-mc-primary/40 hover:border-mc-primary shadow-sm'
                      : 'bg-mc-bg/40 border-mc-border/50 opacity-60 hover:opacity-100 hover:border-mc-border'
                  }`}
                >
                  {/* Checkbox Visual */}
                  <div
                    className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                      isEnabled
                        ? 'bg-mc-primary border-mc-primary text-mc-bg'
                        : 'border-mc-border bg-mc-bg'
                    }`}
                  >
                    {isEnabled && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  {/* Informações do Addon */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-mc-text truncate">
                        {addon.name}
                      </span>
                      {addon.version && (
                        <span className="px-1.5 py-0.2 rounded bg-mc-bg border border-mc-border text-[10px] font-mono text-mc-muted shrink-0">
                          v{addon.version}
                        </span>
                      )}
                    </div>

                    {addon.description && (
                      <p className="text-[11px] text-mc-muted mt-1 leading-snug">
                        {addon.description}
                      </p>
                    )}

                    <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-mc-muted">
                        Camada {index + 2}
                      </span>
                      <span className="text-mc-border">•</span>
                      <span className={isEnabled ? 'text-mc-accent' : 'text-mc-muted'}>
                        {isEnabled ? t.activeStatus : t.inactiveStatus}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rodapé com Ações Rápidas */}
          <div className="pt-2 border-t border-mc-border/60 flex items-center justify-between gap-2 text-xs font-mono">
            <button
              onClick={() => {
                addons.forEach((a) => setAddonEnabled(a.id, true));
              }}
              className="text-[11px] text-mc-primary hover:underline font-semibold"
            >
              {t.enableAll}
            </button>
            <button
              onClick={() => {
                addons.forEach((a) => setAddonEnabled(a.id, false));
              }}
              className="text-[11px] text-mc-muted hover:text-mc-crimson hover:underline"
            >
              {t.vanillaOnly}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
