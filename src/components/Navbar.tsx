'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGear } from '@/context/GearContext';
import { Hammer, BookOpen, History, Share2, Check, Globe } from 'lucide-react';

export function Navbar() {
  const { version, setVersion, availableVersions, lang, setLang, copyShareUrl } = useGear();
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
      version: 'Versão',
    },
    en: {
      builder: 'Simulator',
      materials: 'Catalog & Inventory',
      changelog: 'Changelog',
      share: 'Share',
      copied: 'Copied!',
      version: 'Version',
    },
  }[lang];

  return (
    <header className="sticky top-0 z-50 bg-mc-surface/90 backdrop-blur-md border-b border-mc-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo / Marca */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded bg-gradient-to-br from-mc-primary to-mc-accent flex items-center justify-center shadow-mc-box border border-mc-border group-hover:scale-105 transition-transform">
              <Hammer className="w-5 h-5 text-mc-bg" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wider text-mc-text group-hover:text-mc-primary transition-colors">
                GEAR<span className="text-mc-primary">LABS</span>
              </span>
              <span className="block text-[10px] text-mc-muted leading-none font-mono">Silent Gear Builder</span>
            </div>
          </Link>

          {/* Links de navegação */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/'
                  ? 'bg-mc-border text-mc-primary'
                  : 'text-mc-muted hover:text-mc-text hover:bg-mc-surfaceHover'
              }`}
            >
              <Hammer className="w-4 h-4" />
              {t.builder}
            </Link>
            <Link
              href="/materials"
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/materials'
                  ? 'bg-mc-border text-mc-primary'
                  : 'text-mc-muted hover:text-mc-text hover:bg-mc-surfaceHover'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              {t.materials}
            </Link>
            <Link
              href="/changelog"
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/changelog'
                  ? 'bg-mc-border text-mc-primary'
                  : 'text-mc-muted hover:text-mc-text hover:bg-mc-surfaceHover'
              }`}
            >
              <History className="w-4 h-4" />
              {t.changelog}
            </Link>
          </nav>
        </div>

        {/* Controles da Direita */}
        <div className="flex items-center gap-3">
          {/* Seletor de Versão */}
          <div className="flex items-center gap-1.5 bg-mc-bg px-2.5 py-1 rounded border border-mc-border text-xs font-mono">
            <span className="text-mc-muted">{t.version}:</span>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="bg-transparent text-mc-text font-semibold focus:outline-none cursor-pointer"
            >
              {availableVersions.map((v) => (
                <option key={v} value={v} className="bg-mc-surface text-mc-text">
                  MC {v}
                </option>
              ))}
            </select>
          </div>

          {/* Alternador de Idioma */}
          <button
            onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-mc-card hover:bg-mc-surfaceHover border border-mc-border text-xs text-mc-text transition-colors"
            title="Mudar idioma / Switch language"
          >
            <Globe className="w-3.5 h-3.5 text-mc-primary" />
            <span className="font-semibold uppercase">{lang}</span>
          </button>

          {/* Botão de Compartilhar */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium text-xs transition-all shadow-mc-box border ${
              copied
                ? 'bg-mc-accent/20 border-mc-accent text-mc-accent'
                : 'bg-mc-primary hover:bg-mc-primaryHover border-mc-primary text-mc-bg font-bold'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? t.copied : t.share}
          </button>
        </div>
      </div>
    </header>
  );
}
