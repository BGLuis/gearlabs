'use client';

import React, { useState } from 'react';
import { useGear } from '@/context/GearContext';
import { MaterialCategory } from '@/types/silentgear';
import {
  Search,
  CheckCircle2,
  Circle,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function MaterialsPage() {
  const { catalog, inventory, toggleInventoryMaterial, setAllInventory, setPartMaterial, lang } =
    useGear();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<MaterialCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'tier' | 'durability' | 'damage' | 'armor'>('tier');
  const [sortAsc, setSortAsc] = useState(false);

  const materials = Object.values(catalog.materials);

  // Filtragem
  const filtered = materials.filter((m) => {
    const matchesCat = selectedCat === 'all' || m.category === selectedCat;
    const nameStr = `${m.name.en} ${m.name.pt} ${m.id}`.toLowerCase();
    const matchesSearch = nameStr.includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Ordenação
  const sorted = [...filtered].sort((a, b) => {
    let valA: any = 0;
    let valB: any = 0;
    if (sortBy === 'name') {
      valA = a.name[lang] || a.name.en;
      valB = b.name[lang] || b.name.en;
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (sortBy === 'tier') {
      valA = a.tier;
      valB = b.tier;
    } else if (sortBy === 'durability') {
      valA = a.stats.main?.durability || 0;
      valB = b.stats.main?.durability || 0;
    } else if (sortBy === 'damage') {
      valA = a.stats.main?.melee_damage || 0;
      valB = b.stats.main?.melee_damage || 0;
    } else if (sortBy === 'armor') {
      valA = a.stats.main?.armor || 0;
      valB = b.stats.main?.armor || 0;
    }
    return sortAsc ? valA - valB : valB - valA;
  });

  const categories: Array<{ id: MaterialCategory | 'all'; label: { pt: string; en: string } }> = [
    { id: 'all', label: { pt: 'Todas Categorias', en: 'All Categories' } },
    { id: 'metal', label: { pt: 'Metais', en: 'Metals' } },
    { id: 'gem', label: { pt: 'Gemas', en: 'Gems' } },
    { id: 'wood', label: { pt: 'Madeiras', en: 'Wood' } },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner de Gerenciamento de Inventário */}
      <div className="p-5 bg-gradient-to-r from-mc-surface to-mc-card border border-mc-border rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-mc-text flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-mc-accent" />
            {lang === 'pt' ? 'Catálogo de Materiais & Inventário Pessoal' : 'Materials Catalog & Inventory'}
          </h2>
          <p className="text-xs text-mc-muted mt-1 font-mono">
            {lang === 'pt'
              ? `Marque os materiais que você possui. O otimizador só usará os marcados (${inventory.size} de ${materials.length} disponíveis).`
              : `Check materials you own. The optimizer will only recommend checked ones (${inventory.size} of ${materials.length} available).`}
          </p>
        </div>

        {/* Ações em Lote */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAllInventory(true)}
            className="px-3 py-1.5 rounded bg-mc-bg border border-mc-border text-xs font-mono font-medium hover:border-mc-accent hover:text-mc-accent transition-colors"
          >
            {lang === 'pt' ? 'Marcar Todos' : 'Check All'}
          </button>
          <button
            onClick={() => setAllInventory(false)}
            className="px-3 py-1.5 rounded bg-mc-bg border border-mc-border text-xs font-mono font-medium hover:border-mc-crimson hover:text-mc-crimson transition-colors"
          >
            {lang === 'pt' ? 'Desmarcar Todos' : 'Uncheck All'}
          </button>
        </div>
      </div>

      {/* Barra de Filtro e Busca */}
      <div className="p-4 bg-mc-surface border border-mc-border rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-mc-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={lang === 'pt' ? 'Buscar por nome ou ID...' : 'Search by name or ID...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-mc-bg border border-mc-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-mc-text focus:outline-none focus:border-mc-primary font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Seletor de Categoria */}
          <div className="flex items-center gap-1.5 bg-mc-bg px-2.5 py-1.5 rounded border border-mc-border text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-mc-muted" />
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value as any)}
              className="bg-transparent text-mc-text font-semibold focus:outline-none cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-mc-surface text-mc-text">
                  {c.label[lang]}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-1.5 bg-mc-bg px-2.5 py-1.5 rounded border border-mc-border text-xs font-mono">
            <ArrowUpDown className="w-3.5 h-3.5 text-mc-muted" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-mc-text font-semibold focus:outline-none cursor-pointer"
            >
              <option value="tier" className="bg-mc-surface">Tier</option>
              <option value="name" className="bg-mc-surface">Nome</option>
              <option value="durability" className="bg-mc-surface">Durabilidade</option>
              <option value="damage" className="bg-mc-surface">Dano</option>
              <option value="armor" className="bg-mc-surface">Armadura</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="text-[10px] text-mc-primary hover:underline font-bold"
            >
              {sortAsc ? 'ASC' : 'DESC'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Materiais */}
      <div className="bg-mc-surface border border-mc-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-mc-card/80 border-b border-mc-border text-mc-muted uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3 w-12 text-center">Tenho</th>
                <th className="p-3">Material</th>
                <th className="p-3">Tier</th>
                <th className="p-3">Durabilidade</th>
                <th className="p-3">Dano</th>
                <th className="p-3">Armadura</th>
                <th className="p-3">Traits</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mc-border/60">
              {sorted.map((mat) => {
                const inInv = inventory.has(mat.id);
                const mainStats = mat.stats.main;
                const mainTraits = mat.traits.main || [];

                return (
                  <tr
                    key={mat.id}
                    className={`hover:bg-mc-card/50 transition-colors ${
                      inInv ? '' : 'opacity-60 bg-mc-bg/30'
                    }`}
                  >
                    {/* Checkbox de Inventário */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => toggleInventoryMaterial(mat.id)}
                        className="p-1 rounded text-mc-text hover:text-mc-primary transition-colors"
                        title={inInv ? 'Disponível no inventário' : 'Indisponível'}
                      >
                        {inInv ? (
                          <CheckCircle2 className="w-4 h-4 text-mc-accent" />
                        ) : (
                          <Circle className="w-4 h-4 text-mc-muted" />
                        )}
                      </button>
                    </td>

                    {/* Nome e Cor */}
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-sm"
                          style={{ backgroundColor: mat.color }}
                        />
                        <div>
                          <div className="font-bold text-mc-text text-sm font-sans">
                            {mat.name[lang] || mat.name.en}
                          </div>
                          <div className="text-[10px] text-mc-muted">{mat.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Tier */}
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded bg-mc-card border border-mc-border text-mc-gold font-bold">
                        T{mat.tier}
                      </span>
                    </td>

                    {/* Durabilidade */}
                    <td className="p-3">
                      <span className="text-mc-accent font-bold">
                        {mainStats?.durability || '-'}
                      </span>
                    </td>

                    {/* Dano */}
                    <td className="p-3">
                      <span className="text-mc-crimson font-bold">
                        {mainStats?.melee_damage ? `+${mainStats.melee_damage}` : '-'}
                      </span>
                    </td>

                    {/* Armadura */}
                    <td className="p-3">
                      <span className="text-mc-primary font-bold">
                        {mainStats?.armor ? `+${mainStats.armor}` : '-'}
                      </span>
                    </td>

                    {/* Traits */}
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {mainTraits.map((t, idx) => {
                          const traitInfo = catalog.traits[t.name];
                          return (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-mc-card border border-mc-border text-[10px] text-mc-text"
                              title={traitInfo?.description[lang]}
                            >
                              {traitInfo?.name[lang] || t.name.replace(/^.*:/, '')} {t.level}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* Botão de Testar */}
                    <td className="p-3 text-right">
                      <Link
                        href="/"
                        onClick={() => {
                          setPartMaterial('main', mat.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-mc-surfaceHover hover:bg-mc-primary hover:text-mc-bg text-mc-text border border-mc-border font-bold transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        {lang === 'pt' ? 'Simular' : 'Simulate'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
