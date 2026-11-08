import * as fs from 'fs';
import * as path from 'path';
import type { CatalogIndex, VersionCatalog } from '../../src/types/silentgear';

export const ATM11_DIR = path.resolve(__dirname, '../../public/data/versions/atm11');

export function readAtm11Index(dir: string = ATM11_DIR): CatalogIndex {
  return JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf-8')) as CatalogIndex;
}

/** Caminho do catalog.json da versão `latest` do índice publicado. */
export function latestAtm11CatalogPath(): string {
  const index = readAtm11Index();
  const entry = index.versions.find((v) => v.id === index.latest);
  if (!entry) throw new Error(`index.json: latest '${index.latest}' não está em versions`);
  return path.join(ATM11_DIR, entry.folder, 'catalog.json');
}

export function readLatestAtm11Catalog(): VersionCatalog {
  return JSON.parse(fs.readFileSync(latestAtm11CatalogPath(), 'utf-8')) as VersionCatalog;
}
