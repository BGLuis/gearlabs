'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGear } from '@/context/GearContext';
import { ImportModpackModal } from '@/components/ImportModpackModal';
import { AddonSelector } from '@/components/AddonSelector';
import { Hammer, BookOpen, History, Share2, Check, Globe } from 'lucide-react';

export function Navbar() {
  const { version, setVersion, presets, lang, setLang, copyShareUrl } = useGear();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyShareUrl();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const t = {
    pt: {
      builder: 'Simulador',
      materials: 'Catálogo & Inventário',
      changelog: 'Changelog',
      share: 'Compartilhar',
      copied: 'Copiado!',
      version: 'Versão / Modpack',
    },
    en: {
      builder: 'Simulator',
      materials: 'Catalog & Inventory',
      changelog: 'Changelog',
      share: 'Share',
      copied: 'Copied!',
      version: 'Version / Modpack',
    },
  }[lang];

  // Agrupamento dos presets
  const modpackPresets = presets.filter((p) => p.type === 'modpack');
  const officialPresets = presets.filter((p) => p.type === 'official');
  const customPresets = presets.filter((p) => p.type === 'custom');

  return (
    <header className="sticky top-0 z-50 bg-[#0E0F11]/95 backdrop-blur-md border-b border-mc-border">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo / Marca */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-[30px] h-[30px] rounded-[4px] bg-mc-forge flex items-center justify-center shadow-mc-box group-hover:scale-105 transition-transform">
              <Hammer className="w-4 h-4 text-[#0E0F11]" />
            </div>
            <span className="font-pixel text-[22px] font-semibold tracking-wide text-mc-text group-hover:text-mc-forge transition-colors">
              GearLabs
            </span>
          </Link>

          {/* Links de navegação em formato Pill */}
          <nav className="hidden md:flex items-center gap-1.5">
            <Link
              href="/"
              className={`px-3 h-8 rounded-[6px] text-sm font-medium flex items-center gap-2 transition-colors ${
                pathname === '/'
                  ? 'bg-[#1E2125] text-mc-text border border-[#30343A]/50 shadow-sm'
                  : 'text-mc-mutedLight hover:text-mc-text hover:bg-[#1E2125]/40'
              }`}
            >
              <Hammer className="w-3.5 h-3.5" />
              {t.builder}
            </Link>
            <Link
              href="/materials"
              className={`px-3 h-8 rounded-[6px] text-sm font-medium flex items-center gap-2 transition-colors ${
                pathname === '/materials'
                  ? 'bg-[#1E2125] text-mc-text border border-[#30343A]/50 shadow-sm'
                  : 'text-mc-mutedLight hover:text-mc-text hover:bg-[#1E2125]/40'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {t.materials}
            </Link>
            <Link
              href="/changelog"
              className={`px-3 h-8 rounded-[6px] text-sm font-medium flex items-center gap-2 transition-colors ${
                pathname === '/changelog'
                  ? 'bg-[#1E2125] text-mc-text border border-[#30343A]/50 shadow-sm'
                  : 'text-mc-mutedLight hover:text-mc-text hover:bg-[#1E2125]/40'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              {t.changelog}
            </Link>
          </nav>
        </div>

        {/* Controles da Direita */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Seletor Agrupado de Versões */}
          <div className="flex items-center gap-1.5 bg-[#16181B] hover:bg-[#1E2125] px-2.5 h-8 rounded-[6px] border border-mc-border text-xs font-mono transition-colors">
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="bg-transparent text-mc-text font-medium focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[210px] truncate"
            >
              <optgroup label="🌟 Modpacks em Destaque" className="bg-mc-surface text-mc-gold font-bold">
                {modpackPresets.map((p) => (
                  <option key={p.id} value={p.id} className="text-mc-text">
                    {p.name} [{p.badge}]
                  </option>
                ))}
              </optgroup>

              <optgroup label="📦 Versões Oficiais (Silent Gear)" className="bg-mc-surface text-mc-primary font-bold">
                {officialPresets.map((p) => (
                  <option key={p.id} value={p.id} className="text-mc-text">
                    {p.name}
                  </option>
                ))}
              </optgroup>

              {customPresets.length > 0 && (
                <optgroup label="🛠️ Modpacks Importados" className="bg-mc-surface text-mc-accent font-bold">
                  {customPresets.map((p) => (
                    <option key={p.id} value={p.id} className="text-mc-text">
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Seletor de Addons e Camadas */}
          <AddonSelector />

          {/* Modal de Importação de Modpacks */}
          <ImportModpackModal />

          {/* Alternador de Idioma */}
          <button
            onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-[6px] bg-[#16181B] hover:bg-[#1E2125] border border-mc-border text-xs text-mc-text font-mono transition-colors"
            title="Mudar idioma / Switch language"
          >
            <Globe className="w-3.5 h-3.5 text-mc-forge" />
            <span className="font-semibold uppercase">{lang}</span>
          </button>

          {/* Botão de Compartilhar / Copiar Link */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-[6px] font-medium text-xs transition-all shadow-mc-box border ${
              copied
                ? 'bg-mc-positive/20 border-mc-positive text-mc-positive'
                : 'bg-mc-surface hover:bg-mc-card border-mc-border text-mc-text hover:border-mc-forge hover:text-mc-forge'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? t.copied : (lang === 'pt' ? 'Copiar link' : t.share)}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
