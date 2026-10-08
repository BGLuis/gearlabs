'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { Material, PartSlot } from '@/types/silentgear';
import { filterMaterials, getKeyStatForSlot } from '@/lib/materials';
import { Search, ChevronDown, X, Check, CheckCircle2 } from 'lucide-react';

export interface MaterialComboboxProps {
  materials: Material[];
  selectedMaterialId?: string | null;
  onSelect: (materialId: string) => void;
  onClear?: () => void;
  slot: PartSlot;
  inventory: Set<string>;
  lang?: 'pt' | 'en';
  isRequired?: boolean;
  compact?: boolean;
  placeholder?: string;
  className?: string;
}

export function MaterialCombobox({
  materials,
  selectedMaterialId,
  onSelect,
  onClear,
  slot,
  inventory,
  lang = 'pt',
  isRequired = false,
  compact = false,
  placeholder,
  className = '',
}: MaterialComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyInventory, setOnlyInventory] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const comboboxId = useId();
  const listboxId = `${comboboxId}-listbox`;

  const selectedMaterial = selectedMaterialId
    ? materials.find((m) => m.id === selectedMaterialId)
    : null;

  // Lista filtrada
  const filteredMaterials = filterMaterials(materials, {
    query: searchQuery,
    onlyInventory,
    inventory,
    lang,
  });

  // Itens selecionáveis: se !isRequired, inclui item de opção vazia no topo quando não há busca específica
  const allowEmptyOption = !isRequired && Boolean(onClear);
  const showEmptyOption = allowEmptyOption && (!searchQuery || searchQuery.toLowerCase().includes('nenhum') || searchQuery.toLowerCase().includes('none') || searchQuery.toLowerCase().includes('vazio'));

  // Sincronizar texto do input com o material selecionado quando o dropdown fecha
  useEffect(() => {
    if (!isOpen) {
      if (selectedMaterial) {
        setSearchQuery(selectedMaterial.name[lang] || selectedMaterial.name.en);
      } else {
        setSearchQuery('');
      }
      setFocusedIndex(-1);
    }
  }, [isOpen, selectedMaterial, lang]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Scroll automático do item em foco
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listboxRef.current) {
      const optionEl = listboxRef.current.children[focusedIndex] as HTMLElement;
      if (optionEl) {
        optionEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  function handleOpen() {
    setIsOpen(true);
    // Ao abrir, posiciona o foco no item atualmente selecionado ou no primeiro item
    if (selectedMaterial) {
      const idx = filteredMaterials.findIndex((m) => m.id === selectedMaterial.id);
      setFocusedIndex(idx >= 0 ? (showEmptyOption ? idx + 1 : idx) : 0);
    } else {
      setFocusedIndex(0);
    }
    setTimeout(() => {
      inputRef.current?.select();
    }, 10);
  }

  function handleSelectMaterial(materialId: string) {
    onSelect(materialId);
    setIsOpen(false);
  }

  function handleSelectEmpty() {
    if (onClear) {
      onClear();
    }
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const totalOptions = filteredMaterials.length + (showEmptyOption ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        handleOpen();
      } else {
        setFocusedIndex((prev) => (prev < totalOptions - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        handleOpen();
      } else {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : totalOptions - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen) {
        e.preventDefault();
        if (showEmptyOption && focusedIndex === 0) {
          handleSelectEmpty();
        } else {
          const matIndex = showEmptyOption ? focusedIndex - 1 : focusedIndex;
          if (matIndex >= 0 && matIndex < filteredMaterials.length) {
            handleSelectMaterial(filteredMaterials[matIndex].id);
          }
        }
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    } else if (e.key === 'Tab') {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  }

  const defaultPlaceholder = isRequired
    ? lang === 'pt'
      ? 'Buscar material...'
      : 'Search material...'
    : lang === 'pt'
      ? '(Nenhum / Vazio)'
      : '(None / Empty)';

  const activeOptionId =
    focusedIndex >= 0
      ? showEmptyOption && focusedIndex === 0
        ? `${listboxId}-opt-empty`
        : `${listboxId}-opt-${filteredMaterials[showEmptyOption ? focusedIndex - 1 : focusedIndex]?.id}`
      : undefined;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Campo Combobox Input */}
      <div
        className={`flex items-center gap-1.5 bg-mc-bg border rounded transition-all ${
          isOpen ? 'border-mc-primary ring-1 ring-mc-primary/40' : 'border-mc-border hover:border-mc-borderHover'
        } ${compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'}`}
      >
        {/* Amostra de cor atual */}
        {selectedMaterial && (
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
            style={{ backgroundColor: selectedMaterial.color }}
            title={`Cor: ${selectedMaterial.color}`}
          />
        )}

        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            setFocusedIndex(0);
          }}
          onFocus={handleOpen}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || defaultPlaceholder}
          className="w-full bg-transparent text-mc-text font-medium focus:outline-none placeholder:text-mc-muted/60"
        />

        {/* Botão Limpar (se valor selecionado e não obrigatório) */}
        {!isRequired && selectedMaterial && onClear && (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              setSearchQuery('');
              setIsOpen(false);
            }}
            className="text-mc-muted hover:text-mc-crimson p-0.5 rounded transition-colors"
            title={lang === 'pt' ? 'Limpar seleção' : 'Clear selection'}
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Ícone de Dropdown */}
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            if (isOpen) {
              setIsOpen(false);
            } else {
              handleOpen();
              inputRef.current?.focus();
            }
          }}
          className="text-mc-muted hover:text-mc-text p-0.5 transition-colors shrink-0"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Popover / Dropdown Listbox */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 z-50 min-w-[280px] sm:min-w-[340px] max-w-[420px] bg-mc-surface border border-mc-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in-50 duration-100">
          {/* Cabeçalho do Popover com Filtro de Inventário */}
          <div className="px-2.5 py-1.5 bg-mc-bg/90 border-b border-mc-border flex items-center justify-between text-[11px] font-mono text-mc-muted">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-mc-text select-none">
              <input
                type="checkbox"
                checked={onlyInventory}
                onChange={(e) => setOnlyInventory(e.target.checked)}
                className="rounded border-mc-border text-mc-primary focus:ring-0 cursor-pointer accent-mc-primary"
              />
              <span>
                {lang === 'pt' ? 'Só materiais do meu inventário' : 'Only my inventory'}
              </span>
            </label>
            <span className="text-[10px] text-mc-muted">
              {filteredMaterials.length}{' '}
              {lang === 'pt' ? 'opções' : 'options'}
            </span>
          </div>

          {/* Lista de Opções (role="listbox") */}
          <ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            className="max-h-60 overflow-y-auto p-1 divide-y divide-mc-border/30"
          >
            {/* Opção Vazia (se aplicável) */}
            {showEmptyOption && (
              <li
                id={`${listboxId}-opt-empty`}
                role="option"
                aria-selected={!selectedMaterialId}
                onClick={handleSelectEmpty}
                onMouseEnter={() => setFocusedIndex(0)}
                className={`px-2 py-1.5 rounded cursor-pointer text-xs font-mono flex items-center justify-between transition-colors ${
                  focusedIndex === 0
                    ? 'bg-mc-card text-mc-text border border-mc-primary/40'
                    : 'text-mc-muted hover:bg-mc-bg hover:text-mc-text'
                } ${!selectedMaterialId ? 'font-bold text-mc-primary' : ''}`}
              >
                <span className="italic">
                  {lang === 'pt' ? '(Nenhum / Vazio)' : '(None / Empty)'}
                </span>
                {!selectedMaterialId && <Check className="w-3.5 h-3.5 text-mc-primary" />}
              </li>
            )}

            {/* Materiais Filtrados */}
            {filteredMaterials.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-mc-muted font-mono">
                {lang === 'pt'
                  ? 'Nenhum material encontrado com este filtro.'
                  : 'No materials found matching this filter.'}
              </li>
            ) : (
              filteredMaterials.map((mat, idx) => {
                const itemIndex = showEmptyOption ? idx + 1 : idx;
                const isSelected = selectedMaterialId === mat.id;
                const isFocused = focusedIndex === itemIndex;
                const inInv = inventory.has(mat.id);
                const keyStat = getKeyStatForSlot(mat, slot, lang);

                return (
                  <li
                    key={mat.id}
                    id={`${listboxId}-opt-${mat.id}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectMaterial(mat.id)}
                    onMouseEnter={() => setFocusedIndex(itemIndex)}
                    className={`px-2 py-1.5 rounded cursor-pointer text-xs flex items-center justify-between gap-2 transition-colors ${
                      isFocused
                        ? 'bg-mc-card text-mc-text border border-mc-primary/50'
                        : isSelected
                          ? 'bg-mc-bg text-mc-text'
                          : 'text-mc-muted hover:bg-mc-bg hover:text-mc-text'
                    }`}
                  >
                    {/* Lado Esquerdo: Marca de Inventário + Cor + Nome + Tier */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {/* Marcação de Inventário */}
                      <span
                        className={`text-xs font-mono font-bold shrink-0 ${
                          inInv ? 'text-mc-accent' : 'text-mc-muted/40'
                        }`}
                        title={
                          inInv
                            ? lang === 'pt'
                              ? 'No seu inventário'
                              : 'In your inventory'
                            : lang === 'pt'
                              ? 'Fora do inventário'
                              : 'Not in inventory'
                        }
                      >
                        {inInv ? '✓' : '○'}
                      </span>

                      {/* Amostra de Cor */}
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                        style={{ backgroundColor: mat.color }}
                      />

                      {/* Nome do Material */}
                      <span
                        className={`truncate font-medium ${
                          isSelected ? 'text-mc-primary font-bold' : 'text-mc-text'
                        }`}
                      >
                        {mat.name[lang] || mat.name.en}
                      </span>

                      {/* Tier */}
                      <span className="text-[10px] text-mc-muted font-mono shrink-0">
                        [T{mat.tier}]
                      </span>
                    </div>

                    {/* Lado Direito: Stat Chave do Slot + Ícone de Selecionado */}
                    <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                      {keyStat && (
                        <span className="text-mc-gold/90 bg-mc-bg/70 px-1 py-0.2 rounded border border-mc-border/40 text-[10px]">
                          {keyStat}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-mc-primary shrink-0" />
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
