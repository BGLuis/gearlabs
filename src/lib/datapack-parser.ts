import JSZip from 'jszip';
import { Material, VersionCatalog } from '@/types/silentgear';
import { OFFICIAL_GEAR_TYPES, OFFICIAL_TRAITS } from '@/data/defaultCatalog';

export async function parseDatapackZip(file: File): Promise<VersionCatalog> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  const materials: Record<string, Material> = {};

  const files = Object.keys(loadedZip.files);
  const materialFiles = files.filter(
    (name) =>
      !loadedZip.files[name].dir &&
      (name.includes('silentgear_materials/') || name.endsWith('.json')) &&
      name.endsWith('.json')
  );

  for (const filePath of materialFiles) {
    try {
      const content = await loadedZip.files[filePath].async('text');
      const json = JSON.parse(content);

      const baseName = filePath.split('/').pop()?.replace('.json', '') || 'custom';
      const id = json.id || `custom:${baseName}`;

      // Extrair cor (suporta #RRGGBB ou #AARRGGBB)
      let color = json.display?.color || json.model?.color || '#D8D8D8';
      if (color.startsWith('#FF') && color.length === 9) {
        color = '#' + color.slice(3);
      }

      // Normalizar stats: suporta tanto 1.20 ("stats") quanto 1.21 ("properties")
      const rawStats = json.stats || {};
      const rawProps = json.properties || {};

      const mainProps = rawProps['silentgear:main'] || rawProps.main || {};
      const rodProps = rawProps['silentgear:rod'] || rawProps.rod || {};
      const tipProps = rawProps['silentgear:tip'] || rawProps.tip || {};

      const material: Material = {
        id,
        name: {
          en: json.name?.en || json.display?.name?.en || baseName.replace(/_/g, ' '),
          pt: json.name?.pt || json.display?.name?.pt || baseName.replace(/_/g, ' '),
        },
        tier: json.availability?.tier || json.tier || 1,
        category: (json.availability?.categories?.[0] || 'metal') as any,
        color,
        stats: {
          main: {
            durability: mainProps.durability || rawStats.main?.durability || 250,
            armor: mainProps.armor || rawStats.main?.armor || 0,
            armor_toughness: mainProps.armor_toughness || rawStats.main?.armor_toughness || 0,
            magic_armor: mainProps.magic_armor || rawStats.main?.magic_armor || 0,
            melee_damage: mainProps.attack_damage || rawStats.main?.melee_damage || 2.0,
            attack_speed: mainProps.attack_speed || rawStats.main?.attack_speed || 0.0,
            harvest_speed: mainProps.harvest_speed || rawStats.main?.harvest_speed || 6.0,
            harvest_tier:
              typeof mainProps.harvest_tier === 'object'
                ? mainProps.harvest_tier?.name
                : rawStats.main?.harvest_tier || 'minecraft:iron',
            rarity: mainProps.rarity || rawStats.main?.rarity || 20,
          },
          rod: {
            durability: rodProps.durability || rawStats.rod?.durability || 50,
          },
          tip: {
            durability:
              typeof tipProps.durability === 'object'
                ? tipProps.durability?.value
                : rawStats.tip?.durability || 64,
            melee_damage:
              typeof tipProps.attack_damage === 'object'
                ? tipProps.attack_damage?.value
                : rawStats.tip?.melee_damage || 1.0,
            harvest_speed:
              typeof tipProps.harvest_speed === 'object'
                ? tipProps.harvest_speed?.value
                : rawStats.tip?.harvest_speed || 1.0,
          },
        },
        traits: {
          main: (mainProps.traits || rawStats.main?.traits || []).map((t: any) => ({
            name: t.trait || t.name,
            level: t.level || 1,
          })),
        },
      };

      materials[id] = material;
    } catch (e) {
      console.warn(`[datapack-parser] Failed to parse ${filePath}:`, e);
    }
  }

  return {
    version: 'custom',
    materials,
    gearTypes: OFFICIAL_GEAR_TYPES,
    traits: OFFICIAL_TRAITS,
  };
}

export function parseDumpTsv(tsvText: string): VersionCatalog {
  const lines = tsvText.split('\n').filter((l) => l.trim().length > 0);
  const materials: Record<string, Material> = {};

  // Formato de linhas do /sgear_mats dump
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 3) continue;

    const id = cols[0].trim();
    const tier = parseInt(cols[1], 10) || 1;
    const durability = parseFloat(cols[2]) || 250;
    const damage = parseFloat(cols[3]) || 2.0;

    materials[id] = {
      id,
      name: { en: id.replace(/^.*:/, ''), pt: id.replace(/^.*:/, '') },
      tier,
      category: 'metal',
      color: '#A0A0A0',
      stats: {
        main: {
          durability,
          melee_damage: damage,
          armor: 10,
          harvest_speed: 6.0,
        },
        rod: { durability: 50 },
      },
      traits: {},
    };
  }

  return {
    version: 'custom',
    materials,
    gearTypes: OFFICIAL_GEAR_TYPES,
    traits: OFFICIAL_TRAITS,
  };
}
