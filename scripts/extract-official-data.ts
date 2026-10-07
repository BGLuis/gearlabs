import * as fs from 'fs';
import * as path from 'path';
import { VersionCatalog } from '../src/types/silentgear';
import {
  ATM11_MATERIALS,
  OFFICIAL_MATERIALS_1_20,
  OFFICIAL_MATERIALS_1_21,
  OFFICIAL_GEAR_TYPES,
  OFFICIAL_TRAITS,
} from '../src/data/defaultCatalog';

export function exportCatalog(version: string, materials: any, targetDir: string) {
  const catalog: VersionCatalog = {
    version,
    materials,
    gearTypes: OFFICIAL_GEAR_TYPES,
    traits: OFFICIAL_TRAITS,
  };

  const dir = path.join(targetDir, version);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(`[extract-official-data] Catalog saved for ${version} in ${dir}/catalog.json (${Object.keys(materials).length} materials)`);
}

async function main() {
  const outDir = path.resolve(__dirname, '../public/data/versions');
  console.log(`[extract-official-data] Generating catalogs into: ${outDir}`);

  // 1. Modpacks
  exportCatalog('atm11', ATM11_MATERIALS, outDir);
  exportCatalog('atm10', ATM11_MATERIALS, outDir);
  exportCatalog('atm9', ATM11_MATERIALS, outDir);

  // 2. Oficiais
  exportCatalog('1.21.1', OFFICIAL_MATERIALS_1_21, outDir);
  exportCatalog('1.20.1', OFFICIAL_MATERIALS_1_20, outDir);
  exportCatalog('1.19.2', OFFICIAL_MATERIALS_1_20, outDir);

  console.log('[extract-official-data] All catalogs generated successfully!');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
