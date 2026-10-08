import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

interface LayerDef {
  layerKey: 'rod' | 'guard' | 'binding' | 'grip' | 'main' | 'tip' | 'highlight';
  fileName: string;
}

const GEAR_TYPES_CONFIG: Record<string, LayerDef[]> = {
  sword: [
    { layerKey: 'rod', fileName: 'rod_generic_lc.png' },
    { layerKey: 'guard', fileName: 'guard_generic_hc.png' },
    { layerKey: 'main', fileName: 'main_generic_hc.png' },
    { layerKey: 'grip', fileName: 'grip_wool.png' },
    { layerKey: 'tip', fileName: 'tip_sharp.png' },
    { layerKey: 'highlight', fileName: '_highlight.png' },
  ],
  katana: [
    { layerKey: 'rod', fileName: 'rod_generic_lc.png' },
    { layerKey: 'main', fileName: 'main_generic_hc.png' },
    { layerKey: 'grip', fileName: 'grip_wool.png' },
    { layerKey: 'tip', fileName: 'tip_sharp.png' },
    { layerKey: 'highlight', fileName: '_highlight.png' },
  ],
  pickaxe: [
    { layerKey: 'rod', fileName: 'rod_generic_lc.png' },
    { layerKey: 'binding', fileName: 'binding_generic.png' },
    { layerKey: 'grip', fileName: 'grip_wool.png' },
    { layerKey: 'main', fileName: 'main_generic_hc.png' },
    { layerKey: 'tip', fileName: 'tip_sharp.png' },
    { layerKey: 'highlight', fileName: '_highlight.png' },
  ],
  axe: [
    { layerKey: 'rod', fileName: 'rod_generic_lc.png' },
    { layerKey: 'binding', fileName: 'binding_generic.png' },
    { layerKey: 'grip', fileName: 'grip_wool.png' },
    { layerKey: 'main', fileName: 'main_generic_hc.png' },
    { layerKey: 'tip', fileName: 'tip_sharp.png' },
    { layerKey: 'highlight', fileName: '_highlight.png' },
  ],
  helmet: [
    { layerKey: 'main', fileName: 'main_generic_hc.png' },
    { layerKey: 'tip', fileName: 'tip_sharp.png' },
    { layerKey: 'highlight', fileName: '_highlight.png' },
  ],
  chestplate: [
    { layerKey: 'main', fileName: 'main_generic_hc.png' },
    { layerKey: 'tip', fileName: 'tip_sharp.png' },
    { layerKey: 'highlight', fileName: '_highlight.png' },
  ],
  leggings: [
    { layerKey: 'main', fileName: 'main_generic_hc.png' },
    { layerKey: 'tip', fileName: 'tip_sharp.png' },
    { layerKey: 'highlight', fileName: '_highlight.png' },
  ],
  boots: [
    { layerKey: 'main', fileName: 'main_generic_hc.png' },
    { layerKey: 'tip', fileName: 'tip_sharp.png' },
    { layerKey: 'highlight', fileName: '_highlight.png' },
  ],
};

const RAW_BASE_URL =
  'https://raw.githubusercontent.com/SilentChaos512/Silent-Gear/1.21.x/src/main/resources/assets/silentgear/textures/item';
const LICENSE_URL =
  'https://raw.githubusercontent.com/SilentChaos512/Silent-Gear/1.21.x/LICENSE';

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

export async function downloadAndExtractTextures(rootDir: string) {
  const publicTexturesDir = path.join(rootDir, 'public', 'textures');
  const itemsDir = path.join(publicTexturesDir, 'item');
  const dataOutFile = path.join(rootDir, 'src', 'data', 'gear-textures.ts');

  fs.mkdirSync(itemsDir, { recursive: true });

  // 1. Download License
  console.log('[download-textures] Downloading Silent Gear MIT License...');
  const licenseText = (await fetchBuffer(LICENSE_URL)).toString('utf-8');
  fs.writeFileSync(path.join(publicTexturesDir, 'LICENSE'), licenseText, 'utf-8');
  console.log('[download-textures] Saved license to public/textures/LICENSE');

  const generatedTextures: Record<string, Record<string, Array<{ x: number; y: number; shade: number }>>> = {};

  // 2. Download and parse textures for each gear type
  for (const [gearType, layers] of Object.entries(GEAR_TYPES_CONFIG)) {
    const gearDir = path.join(itemsDir, gearType);
    fs.mkdirSync(gearDir, { recursive: true });
    generatedTextures[gearType] = {};

    console.log(`[download-textures] Processing ${gearType}...`);
    for (const layer of layers) {
      const url = `${RAW_BASE_URL}/${gearType}/${layer.fileName}`;
      const buf = await fetchBuffer(url);
      fs.writeFileSync(path.join(gearDir, layer.fileName), buf);

      const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
      const pixels: Array<{ x: number; y: number; shade: number }> = [];

      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
          const idx = (y * info.width + x) * 4;
          const alpha = data[idx + 3];
          if (alpha > 0) {
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            // Grayscale shade (or average)
            const shade = Math.round((r + g + b) / 3);
            pixels.push({ x, y, shade });
          }
        }
      }

      if (pixels.length > 0) {
        generatedTextures[gearType][layer.layerKey] = pixels;
      }
    }
  }

  // 3. Generate TypeScript file
  const tsContent = `// Auto-generated by scripts/download-silentgear-textures.ts
// Textures from Silent Gear (https://github.com/SilentChaos512/Silent-Gear) - MIT License

export interface TexturePixel {
  x: number; // 0..15
  y: number; // 0..15
  shade: number; // 0..255 (intensidade de cinza para tingimento)
}

export interface GearTextureLayers {
  rod?: TexturePixel[];
  guard?: TexturePixel[];
  binding?: TexturePixel[];
  grip?: TexturePixel[];
  main?: TexturePixel[];
  tip?: TexturePixel[];
  highlight?: TexturePixel[];
}

export const GEAR_TEXTURES: Record<string, GearTextureLayers> = ${JSON.stringify(generatedTextures, null, 2)};
`;

  fs.mkdirSync(path.dirname(dataOutFile), { recursive: true });
  fs.writeFileSync(dataOutFile, tsContent, 'utf-8');
  console.log(`[download-textures] Saved generated textures to ${dataOutFile}`);
}

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  console.log(`[download-textures] Target root: ${rootDir}`);
  await downloadAndExtractTextures(rootDir);
  console.log('[download-textures] Done!');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
