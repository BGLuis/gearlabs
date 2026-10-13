'use client';

import React, { useEffect, useRef } from 'react';
import { useGear } from '@/context/GearContext';
import { renderGearToCanvas } from '@/lib/canvas-renderer';

export function GearCanvas({ size = 128 }: { size?: number }) {
  const { build, catalog, stats, lang } = useGear();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderGearToCanvas(canvasRef.current, build, catalog, { size });
    }
  }, [build, catalog, size]);

  const gearType = catalog.gearTypes[build.gearTypeId];
  const typeName = gearType?.name[lang] || gearType?.name.en || build.gearTypeId;

  return (
    <div className="relative flex flex-col items-center justify-center p-6 bg-mc-cardSubtle border border-mc-border rounded-[10px] shadow-mc-inset group">
      {/* Badge de Sinergia */}
      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-bold bg-[#16181B] border border-mc-gold/40 text-mc-gold shadow-sm">
        {stats ? `${stats.synergy}% Sinergia` : '—'}
      </div>

      {/* Canvas com Pixel Art */}
      <div className="w-44 h-44 flex items-center justify-center p-3 rounded-[8px] bg-[#0E0F11] border border-mc-border/80 shadow-inner">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="pixelated drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="mt-3 text-center">
        <h3 className="font-semibold text-sm text-mc-text">{typeName}</h3>
        <p className="text-xs text-mc-mutedLight font-mono">
          {build.parts.main
            ? catalog.materials[build.parts.main.materialId]?.name[lang]
            : (lang === 'pt' ? 'Sem material principal' : 'No main material')}
        </p>
      </div>
    </div>
  );
}
