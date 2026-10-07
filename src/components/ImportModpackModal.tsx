'use client';

import React, { useState } from 'react';
import { useGear } from '@/context/GearContext';
import { parseDatapackZip, parseDumpTsv } from '@/lib/datapack-parser';
import { UploadCloud, FileCode, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export function ImportModpackModal() {
  const { importCustomCatalog, lang } = useGear();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'zip' | 'tsv'>('zip');
  const [modpackName, setModpackName] = useState('Meu Modpack Customizado');
  const [tsvText, setTsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatusMsg(null);
    try {
      const catalog = await parseDatapackZip(file);
      const count = Object.keys(catalog.materials).length;
      if (count === 0) {
        setStatusMsg({
          type: 'error',
          text:
            lang === 'pt'
              ? 'Nenhum arquivo de material (silentgear_materials/*.json) encontrado no .zip.'
              : 'No material files found inside the uploaded .zip.',
        });
      } else {
        importCustomCatalog(modpackName, catalog);
        setStatusMsg({
          type: 'success',
          text:
            lang === 'pt'
              ? `${count} materiais importados com sucesso!`
              : `${count} materials successfully imported!`,
        });
        setTimeout(() => setIsOpen(false), 1500);
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: (lang === 'pt' ? 'Erro ao ler arquivo: ' : 'Error reading file: ') + err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTsvImport = () => {
    if (!tsvText.trim()) return;
    setLoading(true);
    try {
      const catalog = parseDumpTsv(tsvText);
      const count = Object.keys(catalog.materials).length;
      if (count === 0) {
        setStatusMsg({
          type: 'error',
          text:
            lang === 'pt'
              ? 'Nenhuma linha de material válida encontrada no texto colado.'
              : 'No valid material rows found in the pasted text.',
        });
      } else {
        importCustomCatalog(modpackName, catalog);
        setStatusMsg({
          type: 'success',
          text:
            lang === 'pt'
              ? `${count} materiais importados com sucesso!`
              : `${count} materials successfully imported!`,
        });
        setTimeout(() => setIsOpen(false), 1500);
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-mc-card hover:bg-mc-surfaceHover border border-mc-border text-xs text-mc-primary font-bold transition-colors shadow-sm"
        title="Importar modpack customizado"
      >
        <UploadCloud className="w-3.5 h-3.5" />
        <span>{lang === 'pt' ? '+ Importar Modpack' : '+ Import Modpack'}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-mc-surface border border-mc-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-mc-border flex items-center justify-between bg-mc-card/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-mc-primary/20 text-mc-primary">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-mc-text">
                    {lang === 'pt' ? 'Importar Modpack / Datapack' : 'Import Custom Modpack'}
                  </h3>
                  <p className="text-[11px] text-mc-muted">
                    {lang === 'pt'
                      ? 'Processamento 100% no seu navegador (sem envio a servidores)'
                      : 'Processed 100% in your browser (no servers involved)'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded text-mc-muted hover:text-mc-text hover:bg-mc-card"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-5 space-y-4">
              {/* Nome do Modpack */}
              <div>
                <label className="block text-xs font-bold text-mc-muted uppercase tracking-wider font-mono mb-1">
                  {lang === 'pt' ? 'Nome do Modpack:' : 'Modpack Name:'}
                </label>
                <input
                  type="text"
                  value={modpackName}
                  onChange={(e) => setModpackName(e.target.value)}
                  className="w-full bg-mc-bg border border-mc-border rounded-lg px-3 py-1.5 text-xs text-mc-text focus:outline-none focus:border-mc-primary font-mono"
                />
              </div>

              {/* Abas */}
              <div className="flex border-b border-mc-border">
                <button
                  onClick={() => setActiveTab('zip')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'zip'
                      ? 'border-mc-primary text-mc-primary'
                      : 'border-transparent text-mc-muted hover:text-mc-text'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  {lang === 'pt' ? 'Arquivo .ZIP' : '.ZIP File'}
                </button>
                <button
                  onClick={() => setActiveTab('tsv')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'tsv'
                      ? 'border-mc-primary text-mc-primary'
                      : 'border-transparent text-mc-muted hover:text-mc-text'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  {lang === 'pt' ? 'Dump (/sgear_mats dump)' : 'Command Dump'}
                </button>
              </div>

              {activeTab === 'zip' ? (
                <div className="p-6 border-2 border-dashed border-mc-border hover:border-mc-primary/60 rounded-xl bg-mc-bg/40 text-center space-y-3 transition-colors">
                  <div className="mx-auto w-10 h-10 rounded-full bg-mc-card flex items-center justify-center text-mc-primary">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-mc-primary hover:bg-mc-primaryHover text-mc-bg font-bold text-xs shadow-mc-box">
                      <span>{lang === 'pt' ? 'Selecionar arquivo .zip' : 'Choose .zip file'}</span>
                      <input
                        type="file"
                        accept=".zip,.jar"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-mc-muted mt-2">
                      {lang === 'pt'
                        ? 'Selecione o .zip contendo os datapacks ou configs do Silent Gear'
                        : 'Select the .zip containing datapacks or Silent Gear configs'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={6}
                    value={tsvText}
                    onChange={(e) => setTsvText(e.target.value)}
                    placeholder={
                      lang === 'pt'
                        ? 'Cole aqui a saída do comando /sgear_mats dump...'
                        : 'Paste /sgear_mats dump output here...'
                    }
                    className="w-full bg-mc-bg border border-mc-border rounded-lg p-3 text-xs text-mc-text font-mono focus:outline-none focus:border-mc-primary"
                  />
                  <button
                    onClick={handleTsvImport}
                    disabled={!tsvText.trim() || loading}
                    className="w-full py-2 rounded-lg bg-mc-primary hover:bg-mc-primaryHover text-mc-bg font-bold text-xs shadow-mc-box disabled:opacity-50"
                  >
                    {lang === 'pt' ? 'Processar Dump' : 'Process Dump'}
                  </button>
                </div>
              )}

              {/* Status Message */}
              {statusMsg && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    statusMsg.type === 'success'
                      ? 'bg-mc-accent/10 border-mc-accent/40 text-mc-accent'
                      : 'bg-mc-crimson/10 border-mc-crimson/40 text-mc-crimson'
                  }`}
                >
                  {statusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{statusMsg.text}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
