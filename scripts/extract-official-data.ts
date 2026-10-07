import * as fs from 'fs';
import * as path from 'path';
import { VersionCatalog } from '../src/types/silentgear';
import {
  OFFICIAL_MATERIALS_1_20,
  OFFICIAL_GEAR_TYPES,
  OFFICIAL_TRAITS,
} from '../src/data/defaultCatalog';

export function exportCatalog(version: string, targetDir: string) {
  const catalog: VersionCatalog = {
    version,
    materials: OFFICIAL_MATERIALS_1_20,
    gearTypes: OFFICIAL_GEAR_TYPES,
    traits: OFFICIAL_TRAITS,
  };

  const dir = path.join(targetDir, version);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(`[extract-official-data] Catalog saved for ${version} in ${dir}/catalog.json`);
}

async function main() {
  const outDir = path.resolve(__dirname, '../public/data/versions');
  console.log(`[extract-official-data] Generating official Silent Gear data into: ${outDir}`);
  exportCatalog('1.20.1', outDir);
  exportCatalog('1.21.1', outDir);
  console.log('[extract-official-data] Extraction complete!');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
