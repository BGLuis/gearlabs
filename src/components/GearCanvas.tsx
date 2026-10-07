'use client';

import React, { useEffect, useRef } from 'react';
import { useGear } from '@/context/GearContext';
import { renderGearToCanvas } from '@/lib/canvas-renderer';

export function GearCanvas({ size = 160 }: { size?: number }) {
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
    <div className="relative flex flex-col items-center justify-center p-6 bg-mc-card/80 border border-mc-border rounded-lg shadow-mc-inset group">
      {/* Badge de Sinergia */}
      <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-mc-bg/90 border border-mc-border text-mc-primary">
        {stats.synergy}% Sinergia
      </div>

      {/* Canvas com Pixel Art */}
      <div className="w-40 h-40 flex items-center justify-center p-2 rounded bg-mc-bg/60 border border-mc-border/60 shadow-inner">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="pixelated drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform duration-300"
        />
      </div>

      <div className="mt-3 text-center">
        <h3 className="font-bold text-sm text-mc-text">{typeName}</h3>
        <p className="text-xs text-mc-muted font-mono">
          {build.parts.main
            ? catalog.materials[build.parts.main.materialId]?.name[lang]
            : 'Custom'}
        </p>
      </div>
    </div>
  );
}
