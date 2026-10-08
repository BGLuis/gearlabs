import { Material } from '@/types/silentgear';
import {
  OFFICIAL_MATERIALS_1_20,
  BREEZE_ROD_MATERIAL,
  ALLTHEMODIUM_MATERIALS,
} from '@/data/defaultCatalog';

// Fixture legada de 16 materiais (Issue #12 / Issue #45)
export const ATM11_MATERIALS: Record<string, Material> = {
  ...OFFICIAL_MATERIALS_1_20,
  'silentgear:breeze_rod': BREEZE_ROD_MATERIAL,
  ...ALLTHEMODIUM_MATERIALS,
};
