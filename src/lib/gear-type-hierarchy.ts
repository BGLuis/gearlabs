// Hierarquia oficial de tipos do Silent Gear (GearTypes.java)
export const GEAR_TYPE_PARENTS: Record<string, string | null> = {
  all: null,
  tool: 'all',
  armor: 'all',
  curio: 'all',
  projectile: 'all',
  weapon: 'tool',
  harvest_tool: 'tool',
  melee_weapon: 'weapon',
  ranged_weapon: 'weapon',
  hybrid_weapon: 'weapon',
  sword: 'melee_weapon',
  katana: 'melee_weapon',
  machete: 'melee_weapon',
  spear: 'melee_weapon',
  mace: 'melee_weapon',
  dagger: 'melee_weapon',
  knife: 'melee_weapon',
  bow: 'ranged_weapon',
  crossbow: 'ranged_weapon',
  slingshot: 'ranged_weapon',
  trident: 'hybrid_weapon',
  pickaxe: 'harvest_tool',
  axe: 'harvest_tool',
  shovel: 'harvest_tool',
  hoe: 'harvest_tool',
  shears: 'harvest_tool',
  sickle: 'harvest_tool',
  mattock: 'harvest_tool',
  paxel: 'harvest_tool',
  helmet: 'armor',
  chestplate: 'armor',
  leggings: 'armor',
  boots: 'armor',
  elytra: 'armor',
};

export function getGearTypeAncestors(gearTypeId: string): string[] {
  const normalized = gearTypeId.replace(/^silentgear:/, '');
  const ancestors: string[] = [normalized];
  let current: string | null | undefined = normalized;

  while (current && GEAR_TYPE_PARENTS[current] !== undefined && GEAR_TYPE_PARENTS[current] !== null) {
    const parent: string | null = GEAR_TYPE_PARENTS[current];
    if (!parent) break;
    ancestors.push(parent);
    current = parent;
  }

  return ancestors;
}
