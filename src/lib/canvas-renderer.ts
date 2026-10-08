import { GearBuild, VersionCatalog } from '@/types/silentgear';

export interface RenderOptions {
  size?: number; // Tamanho do canvas (ex: 64, 128, 256)
}

function hexToRgb(hex: string): [number, number, number] {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

interface ItemLayerPixel {
  x: number;
  y: number;
  type: number;
}

interface ItemTemplate {
  rod?: ItemLayerPixel[];
  guard?: ItemLayerPixel[];
  main?: ItemLayerPixel[];
  tip?: ItemLayerPixel[];
}

// Mapas de pixels para templates 16x16 autênticos estilo Minecraft
// 0 = transparente, 1 = cor primária, 2 = sombra, 3 = brilho/highlight
const SWORD_LAYERS: ItemTemplate = {
  rod: [
    { x: 2, y: 13, type: 2 },
    { x: 3, y: 12, type: 1 },
    { x: 4, y: 11, type: 1 },
    { x: 1, y: 14, type: 2 }, // pommel
  ],
  guard: [
    { x: 3, y: 10, type: 2 },
    { x: 4, y: 10, type: 1 },
    { x: 5, y: 11, type: 2 },
    { x: 5, y: 9, type: 3 },
  ],
  main: [
    { x: 5, y: 10, type: 1 },
    { x: 6, y: 9, type: 1 },
    { x: 7, y: 8, type: 1 },
    { x: 8, y: 7, type: 1 },
    { x: 9, y: 6, type: 1 },
    { x: 10, y: 5, type: 1 },
    { x: 11, y: 4, type: 1 },
    { x: 12, y: 3, type: 1 },
    // Aresta com sombra
    { x: 6, y: 10, type: 2 },
    { x: 7, y: 9, type: 2 },
    { x: 8, y: 8, type: 2 },
    { x: 9, y: 7, type: 2 },
    { x: 10, y: 6, type: 2 },
    { x: 11, y: 5, type: 2 },
    { x: 12, y: 4, type: 2 },
    // Dorso com brilho
    { x: 6, y: 8, type: 3 },
    { x: 7, y: 7, type: 3 },
    { x: 8, y: 6, type: 3 },
    { x: 9, y: 5, type: 3 },
    { x: 10, y: 4, type: 3 },
    { x: 11, y: 3, type: 3 },
  ],
  tip: [
    { x: 13, y: 2, type: 1 },
    { x: 13, y: 3, type: 2 },
    { x: 12, y: 2, type: 3 },
    { x: 14, y: 1, type: 1 },
  ],
};

const PICKAXE_LAYERS: ItemTemplate = {
  rod: [
    { x: 2, y: 13, type: 2 },
    { x: 3, y: 12, type: 1 },
    { x: 4, y: 11, type: 1 },
    { x: 5, y: 10, type: 1 },
    { x: 6, y: 9, type: 1 },
    { x: 7, y: 8, type: 1 },
    { x: 8, y: 7, type: 1 },
    { x: 9, y: 6, type: 1 },
  ],
  main: [
    // Curvatura da picareta
    { x: 6, y: 4, type: 1 },
    { x: 7, y: 3, type: 1 },
    { x: 8, y: 3, type: 3 },
    { x: 9, y: 3, type: 3 },
    { x: 10, y: 4, type: 1 },
    { x: 11, y: 5, type: 1 },
    { x: 12, y: 6, type: 1 },
    { x: 13, y: 7, type: 2 },
    { x: 5, y: 5, type: 1 },
    { x: 4, y: 6, type: 1 },
    { x: 3, y: 7, type: 2 },
    // Centro reforçado
    { x: 8, y: 4, type: 2 },
    { x: 9, y: 4, type: 2 },
  ],
  tip: [
    { x: 14, y: 8, type: 1 },
    { x: 2, y: 8, type: 1 },
  ],
};

const ARMOR_CHESTPLATE_LAYERS: ItemTemplate = {
  main: [
    // Ombros
    { x: 3, y: 2, type: 1 }, { x: 4, y: 2, type: 1 }, { x: 11, y: 2, type: 1 }, { x: 12, y: 2, type: 1 },
    { x: 2, y: 3, type: 1 }, { x: 3, y: 3, type: 3 }, { x: 4, y: 3, type: 1 },
    { x: 11, y: 3, type: 1 }, { x: 12, y: 3, type: 3 }, { x: 13, y: 3, type: 2 },
    // Peitoral central
    { x: 2, y: 4, type: 1 }, { x: 3, y: 4, type: 1 }, { x: 4, y: 4, type: 1 },
    { x: 5, y: 4, type: 1 }, { x: 6, y: 4, type: 1 }, { x: 9, y: 4, type: 1 }, { x: 10, y: 4, type: 1 },
    { x: 11, y: 4, type: 1 }, { x: 12, y: 4, type: 1 }, { x: 13, y: 4, type: 2 },
    // Tronco
    { x: 3, y: 5, type: 1 }, { x: 4, y: 5, type: 3 }, { x: 5, y: 5, type: 1 }, { x: 6, y: 5, type: 1 },
    { x: 7, y: 5, type: 1 }, { x: 8, y: 5, type: 1 }, { x: 9, y: 5, type: 1 }, { x: 10, y: 5, type: 1 },
    { x: 11, y: 5, type: 1 }, { x: 12, y: 5, type: 2 },
    { x: 3, y: 6, type: 1 }, { x: 4, y: 6, type: 1 }, { x: 5, y: 6, type: 1 }, { x: 6, y: 6, type: 1 },
    { x: 7, y: 6, type: 1 }, { x: 8, y: 6, type: 1 }, { x: 9, y: 6, type: 1 }, { x: 10, y: 6, type: 1 },
    { x: 11, y: 6, type: 1 }, { x: 12, y: 6, type: 2 },
    // Base da cintura
    { x: 4, y: 7, type: 1 }, { x: 5, y: 7, type: 1 }, { x: 6, y: 7, type: 1 }, { x: 7, y: 7, type: 2 },
    { x: 8, y: 7, type: 2 }, { x: 9, y: 7, type: 1 }, { x: 10, y: 7, type: 1 }, { x: 11, y: 7, type: 2 },
  ],
  tip: [],
  rod: [],
};

export function renderGearToCanvas(
  canvas: HTMLCanvasElement,
  build: GearBuild,
  catalog: VersionCatalog,
  options: RenderOptions = {}
): void {
  const size = options.size || 128;
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);

  const pixelScale = Math.max(1, Math.floor(size / 16));
  const offsetX = Math.floor((size - pixelScale * 16) / 2);
  const offsetY = Math.floor((size - pixelScale * 16) / 2);

  const mainMat = build.parts.main ? catalog.materials[build.parts.main.materialId] : null;
  const rodMat = build.parts.rod ? catalog.materials[build.parts.rod.materialId] : null;
  const tipMat = build.parts.tip ? catalog.materials[build.parts.tip.materialId] : null;

  const mainRgb = hexToRgb(mainMat?.color || '#D8D8D8');
  const rodRgb = hexToRgb(rodMat?.color || '#86654B');
  const tipRgb = hexToRgb(tipMat?.color || mainMat?.color || '#33EBCB');

  // Selecionar template pela categoria ou id
  let template = SWORD_LAYERS;
  if (build.gearTypeId === 'pickaxe') {
    template = PICKAXE_LAYERS;
  } else if (['chestplate', 'helmet', 'leggings', 'boots'].includes(build.gearTypeId)) {
    template = ARMOR_CHESTPLATE_LAYERS as any;
  }

  function drawPixels(
    pixels: Array<{ x: number; y: number; type: number }>,
    baseRgb: [number, number, number]
  ) {
    if (!ctx) return;
    for (const p of pixels) {
      let [r, g, b] = baseRgb;
      if (p.type === 2) {
        // Sombra: 30% mais escuro
        r = Math.round(r * 0.7);
        g = Math.round(g * 0.7);
        b = Math.round(b * 0.7);
      } else if (p.type === 3) {
        // Brilho: 30% mais claro
        r = Math.min(255, Math.round(r * 1.35 + 20));
        g = Math.min(255, Math.round(g * 1.35 + 20));
        b = Math.min(255, Math.round(b * 1.35 + 20));
      }

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(
        offsetX + p.x * pixelScale,
        offsetY + p.y * pixelScale,
        pixelScale,
        pixelScale
      );
    }
  }

  // 1. Desenhar haste (Rod)
  if (template.rod && template.rod.length > 0) {
    drawPixels(template.rod, rodRgb);
  }

  // 2. Desenhar guarda se for espada
  if ((template as any).guard) {
    drawPixels((template as any).guard, rodRgb);
  }

  // 3. Desenhar lâmina / corpo principal (Main)
  if (template.main && template.main.length > 0) {
    drawPixels(template.main, mainRgb);
  }

  // 4. Desenhar ponta se houver (Tip)
  if (tipMat && template.tip && template.tip.length > 0) {
    drawPixels(template.tip, tipRgb);
  }
}
