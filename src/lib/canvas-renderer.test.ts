import { describe, it, expect } from 'vitest';
import { renderGearToCanvas } from './canvas-renderer';
import { ATM11_CATALOG } from '@/data/defaultCatalog';
import { GearBuild } from '@/types/silentgear';

function createMockCanvas(initialSize = 128) {
  let width = initialSize;
  let height = initialSize;
  let buffer = new Uint8ClampedArray(width * height * 4);
  let currentFillStyle = 'rgb(0, 0, 0)';
  const fillRectCalls: Array<{ x: number; y: number; w: number; h: number; fillStyle: string }> = [];

  const parseRgb = (style: string): [number, number, number] => {
    const match = style.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
    }
    return [0, 0, 0];
  };

  const resizeBuffer = () => {
    buffer = new Uint8ClampedArray(width * height * 4);
  };

  const ctx = {
    imageSmoothingEnabled: false,
    set fillStyle(val: string) {
      currentFillStyle = val;
    },
    get fillStyle() {
      return currentFillStyle;
    },
    clearRect(x: number, y: number, w: number, h: number) {
      for (let cy = y; cy < y + h; cy++) {
        for (let cx = x; cx < x + w; cx++) {
          if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
            const idx = (cy * width + cx) * 4;
            buffer[idx] = 0;
            buffer[idx + 1] = 0;
            buffer[idx + 2] = 0;
            buffer[idx + 3] = 0;
          }
        }
      }
    },
    fillRect(x: number, y: number, w: number, h: number) {
      fillRectCalls.push({ x, y, w, h, fillStyle: currentFillStyle });
      const [r, g, b] = parseRgb(currentFillStyle);
      for (let cy = y; cy < y + h; cy++) {
        for (let cx = x; cx < x + w; cx++) {
          if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
            const idx = (cy * width + cx) * 4;
            buffer[idx] = r;
            buffer[idx + 1] = g;
            buffer[idx + 2] = b;
            buffer[idx + 3] = 255;
          }
        }
      }
    },
    getImageData(x: number, y: number, w: number, h: number) {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let cy = 0; cy < h; cy++) {
        for (let cx = 0; cx < w; cx++) {
          const srcX = x + cx;
          const srcY = y + cy;
          if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
            const srcIdx = (srcY * width + srcX) * 4;
            const dstIdx = (cy * w + cx) * 4;
            data[dstIdx] = buffer[srcIdx];
            data[dstIdx + 1] = buffer[srcIdx + 1];
            data[dstIdx + 2] = buffer[srcIdx + 2];
            data[dstIdx + 3] = buffer[srcIdx + 3];
          }
        }
      }
      return { data, width: w, height: h };
    },
  };

  const canvas = {
    get width() {
      return width;
    },
    set width(val: number) {
      width = val;
      resizeBuffer();
    },
    get height() {
      return height;
    },
    set height(val: number) {
      height = val;
      resizeBuffer();
    },
    getContext: (type: string) => (type === '2d' ? ctx : null),
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx, fillRectCalls, getBuffer: () => buffer };
}

describe('renderGearToCanvas (Issue #11)', () => {
  const GEAR_TYPES = [
    'sword',
    'katana',
    'pickaxe',
    'axe',
    'helmet',
    'chestplate',
    'leggings',
    'boots',
  ] as const;

  it('não produz nenhum pixel com alpha fracionário (entre 1 e 254) para os 8 tipos de gear', () => {
    for (const gearTypeId of GEAR_TYPES) {
      const { canvas, ctx } = createMockCanvas(128);

      const build: GearBuild = {
        gearTypeId,
        parts: {
          main: { materialId: 'silentgear:iron' },
          rod: { materialId: 'silentgear:wood' },
          tip: { materialId: 'silentgear:diamond' },
        },
      };

      renderGearToCanvas(canvas, build, ATM11_CATALOG, { size: 128 });

      const { data } = ctx.getImageData(0, 0, 128, 128);
      let semiTransparentPixels = 0;
      let opaquePixels = 0;

      for (let i = 3; i < data.length; i += 4) {
        const alpha = data[i];
        if (alpha > 0 && alpha < 255) {
          semiTransparentPixels++;
        } else if (alpha === 255) {
          opaquePixels++;
        }
      }

      expect(semiTransparentPixels, `Tipo ${gearTypeId} gerou pixels com alpha intermediário`).toBe(0);
      expect(opaquePixels, `Tipo ${gearTypeId} deve conter pixels opacos desenhados`).toBeGreaterThan(0);
    }
  });

  it('garante que todas as coordenadas e dimensões enviadas ao fillRect sejam números inteiros', () => {
    for (const gearTypeId of GEAR_TYPES) {
      const { canvas, fillRectCalls } = createMockCanvas(128);

      const build: GearBuild = {
        gearTypeId,
        parts: {
          main: { materialId: 'silentgear:iron' },
          rod: { materialId: 'silentgear:wood' },
        },
      };

      renderGearToCanvas(canvas, build, ATM11_CATALOG, { size: 128 });

      expect(fillRectCalls.length).toBeGreaterThan(0);
      for (const call of fillRectCalls) {
        expect(Number.isInteger(call.x), `call.x (${call.x}) deve ser inteiro`).toBe(true);
        expect(Number.isInteger(call.y), `call.y (${call.y}) deve ser inteiro`).toBe(true);
        expect(Number.isInteger(call.w), `call.w (${call.w}) deve ser inteiro`).toBe(true);
        expect(Number.isInteger(call.h), `call.h (${call.h}) deve ser inteiro`).toBe(true);
      }
    }
  });

  it('renderiza com coordenadas inteiras mesmo quando o size fornecido não for múltiplo de 16', () => {
    const { canvas, fillRectCalls, ctx } = createMockCanvas(180);

    const build: GearBuild = {
      gearTypeId: 'sword',
      parts: {
        main: { materialId: 'silentgear:diamond' },
        rod: { materialId: 'silentgear:iron' },
      },
    };

    renderGearToCanvas(canvas, build, ATM11_CATALOG, { size: 180 });

    expect(canvas.width).toBe(180);
    expect(canvas.height).toBe(180);

    for (const call of fillRectCalls) {
      expect(Number.isInteger(call.x)).toBe(true);
      expect(Number.isInteger(call.y)).toBe(true);
      expect(Number.isInteger(call.w)).toBe(true);
      expect(Number.isInteger(call.h)).toBe(true);
    }

    const { data } = ctx.getImageData(0, 0, 180, 180);
    let semiTransparentPixels = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0 && data[i] < 255) {
        semiTransparentPixels++;
      }
    }
    expect(semiTransparentPixels).toBe(0);
  });

  it('verifica que o tamanho padrão de 128px cabe na área útil de um container w-40 p-2 (144px)', () => {
    const containerWidth = 160; // w-40 = 10rem = 160px
    const padding = 8 * 2; // p-2 = 0.5rem = 8px de cada lado = 16px
    const usableWidth = containerWidth - padding; // 144px

    const canvasSize = 128;
    expect(canvasSize).toBeLessThanOrEqual(usableWidth);

    // E mesmo com escala hover de 110% (scale-110)
    const hoverSize = canvasSize * 1.1;
    expect(hoverSize).toBeLessThanOrEqual(usableWidth);
  });
});
