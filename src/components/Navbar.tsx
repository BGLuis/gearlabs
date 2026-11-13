'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGear } from '@/context/GearContext';
import { ImportModpackModal } from '@/components/ImportModpackModal';
import { AddonSelector } from '@/components/AddonSelector';
import { Hammer, BookOpen, RotateCcwClock, FlaskConical, Share2, Check, Globe } from 'lucide-react';

export function Navbar() {
  const { version, setVersion, packInfo, setPackVersion, presets, lang, setLang, copyShareUrl } = useGear();
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
      formulas: 'Fórmulas',
      mainNav: 'Navegação principal',
      share: 'Compartilhar',
      copied: 'Copiado!',
      version: 'Versão / Modpack',
      packVersion: 'Versão do modpack',
      latestTag: 'mais recente',
    },
    en: {
      builder: 'Simulator',
      materials: 'Catalog & Inventory',
      changelog: 'Changelog',
      formulas: 'Formulas',
      mainNav: 'Main navigation',
      share: 'Share',
      copied: 'Copied!',
      version: 'Version / Modpack',
      packVersion: 'Modpack version',
      latestTag: 'latest',
    },
  }[lang];

  // Agrupamento dos presets
  const modpackPresets = presets.filter((p) => p.type === 'modpack');
  const officialPresets = presets.filter((p) => p.type === 'official');
  const customPresets = presets.filter((p) => p.type === 'custom');

  const navItems = [
    { href: '/', label: t.builder, Icon: Hammer },
    { href: '/materials', label: t.materials, Icon: BookOpen },
    { href: '/changelog', label: t.changelog, Icon: RotateCcwClock },
    { href: '/formulas', label: t.formulas, Icon: FlaskConical },
  ];

  // `compact`: abaixo de 2xl a barra do topo só tem espaço para ícones; o texto vira title/aria-label.
  const renderNavLinks = (compact: boolean) => navItems.map(({ href, label, Icon }) => (
    <Link
      key={href}
      href={href}
      aria-current={pathname === href ? 'page' : undefined}
      {...(compact ? { title: label, 'aria-label': label } : {})}
      className={`px-3 h-8 shrink-0 rounded-[6px] text-sm font-medium flex items-center gap-2 transition-colors ${
        pathname === href
          ? 'bg-[#1E2125] text-mc-text border border-mc-borderHover/50 shadow-xs'
          : 'text-mc-mutedLight hover:text-mc-text hover:bg-[#1E2125]/40'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className={compact ? 'hidden 2xl:inline' : undefined}>{label}</span>
    </Link>
  ));

  return (
    <header className="sticky top-0 z-50 bg-mc-bg/95 backdrop-blur-md border-b border-mc-border">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo / Marca */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-[30px] h-[30px] rounded-[4px] bg-mc-forge flex items-center justify-center shadow-mc-box group-hover:scale-105 transition-transform">
              <Hammer className="w-4 h-4 text-mc-bg" />
            </div>
            <span className="font-pixel text-[22px] font-semibold tracking-wide text-mc-text group-hover:text-mc-forge transition-colors">
              GearLabs
            </span>
          </Link>

          <nav aria-label={t.mainNav} className="hidden md:flex items-center gap-1.5">{renderNavLinks(true)}</nav>
        </div>

        {/* Controles da Direita */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Seletor Agrupado de Versões */}
          <div className="flex items-center gap-1.5 bg-mc-surface hover:bg-[#1E2125] px-2.5 h-8 rounded-[6px] border border-mc-border text-xs font-mono transition-colors">
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="bg-transparent text-mc-text font-medium focus:outline-hidden cursor-pointer max-w-[150px] sm:max-w-[210px] truncate"
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

          {/* Versões do pack: só no ATM11 e quando o índice publica mais de uma */}
          {packInfo && (packInfo.index.versions.length > 1 || packInfo.id !== packInfo.latest) && (
            <div className="flex items-center bg-mc-surface hover:bg-[#1E2125] px-2.5 h-8 rounded-[6px] border border-mc-border text-xs font-mono transition-colors">
              <select
                aria-label={t.packVersion}
                title={t.packVersion}
                value={packInfo.id}
                onChange={(e) => setPackVersion(e.target.value)}
                className="bg-transparent text-mc-text font-medium focus:outline-hidden cursor-pointer max-w-[130px] truncate"
              >
                {!packInfo.index.versions.some((v) => v.id === packInfo.id) && (
                  <option value={packInfo.id}>{packInfo.id}</option>
                )}
                {packInfo.index.versions.map((v) => (
                  <option key={v.id} value={v.id} className="text-mc-text">
                    {v.id}
                    {v.id === packInfo.latest ? ` (${t.latestTag})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Seletor de Addons e Camadas */}
          <AddonSelector />

          {/* Modal de Importação de Modpacks */}
          <ImportModpackModal />

          {/* Alternador de Idioma */}
          <button
            onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-[6px] bg-mc-surface hover:bg-[#1E2125] border border-mc-border text-xs text-mc-text font-mono transition-colors"
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
      {/* Navegação abaixo de md: faixa de pills com rolagem horizontal */}
      <nav
        aria-label={t.mainNav}
        className="md:hidden flex items-center gap-1.5 overflow-x-auto px-4 pb-2 border-t border-mc-border/60 pt-2"
      >
        {renderNavLinks(false)}
      </nav>
    </header>
  );
}
