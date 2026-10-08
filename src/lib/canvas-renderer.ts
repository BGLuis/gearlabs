import { GearBuild, VersionCatalog } from '@/types/silentgear';
import { GEAR_TEXTURES, TexturePixel } from '@/data/gear-textures';

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

  // Resolução de materiais e cores
  // Conforme lógica oficial do Silent Gear (GearArmorItem / getCoatingOrMainPart):
  // se houver coating, o material do revestimento tinge a camada externa (main)
  const coatingMat = build.parts.coating
    ? catalog.materials[build.parts.coating.materialId]
    : null;
  const rawMainMat = build.parts.main
    ? catalog.materials[build.parts.main.materialId]
    : null;
  const mainMat = coatingMat || rawMainMat;

  const rodMat = build.parts.rod
    ? catalog.materials[build.parts.rod.materialId]
    : null;
  const tipMat = build.parts.tip
    ? catalog.materials[build.parts.tip.materialId]
    : null;
  const gripMat = build.parts.grip
    ? catalog.materials[build.parts.grip.materialId]
    : null;
  const bindingMat = build.parts.binding
    ? catalog.materials[build.parts.binding.materialId]
    : null;

  const mainRgb = hexToRgb(mainMat?.color || '#D8D8D8');
  const rodRgb = hexToRgb(rodMat?.color || '#86654B');
  const tipRgb = hexToRgb(tipMat?.color || mainMat?.color || '#33EBCB');
  const gripRgb = hexToRgb(gripMat?.color || '#EEEEEE');
  const bindingRgb = hexToRgb(bindingMat?.color || '#C2B280');

  // Selecionar template do Silent Gear para o tipo de equipamento
  const template =
    GEAR_TEXTURES[build.gearTypeId] || GEAR_TEXTURES['sword'] || {};

  // Função para tingimento multiplicativo oficial do Minecraft:
  // final_c = round((shade * base_c) / 255)
  function drawLayer(
    pixels: TexturePixel[],
    baseRgb: [number, number, number]
  ) {
    if (!ctx) return;
    for (const p of pixels) {
      const r = Math.round((p.shade * baseRgb[0]) / 255);
      const g = Math.round((p.shade * baseRgb[1]) / 255);
      const b = Math.round((p.shade * baseRgb[2]) / 255);

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(
        offsetX + p.x * pixelScale,
        offsetY + p.y * pixelScale,
        pixelScale,
        pixelScale
      );
    }
  }

  // Highlight não é tingido (overlay com brilho)
  function drawHighlight(pixels: TexturePixel[]) {
    if (!ctx) return;
    for (const p of pixels) {
      ctx.fillStyle = `rgb(${p.shade}, ${p.shade}, ${p.shade})`;
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
    drawLayer(template.rod, rodRgb);
  }

  // 2. Desenhar guarda (se aplicável, ex: espada)
  if (template.guard && template.guard.length > 0) {
    drawLayer(template.guard, rodRgb);
  }

  // 3. Desenhar amarração (Binding) se presente
  if (build.parts.binding && template.binding && template.binding.length > 0) {
    drawLayer(template.binding, bindingRgb);
  }

  // 4. Desenhar empunhadura (Grip) se presente
  if (build.parts.grip && template.grip && template.grip.length > 0) {
    drawLayer(template.grip, gripRgb);
  }

  // 5. Desenhar corpo principal / lâmina / armadura (Main)
  if (template.main && template.main.length > 0) {
    drawLayer(template.main, mainRgb);
  }

  // 6. Desenhar ponta / acabamento (Tip) se presente
  if (tipMat && template.tip && template.tip.length > 0) {
    drawLayer(template.tip, tipRgb);
  }

  // 7. Desenhar brilho (Highlight)
  if (template.highlight && template.highlight.length > 0) {
    drawHighlight(template.highlight);
  }
}
