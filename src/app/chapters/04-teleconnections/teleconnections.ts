import { EnsoPhase } from '../../core/data/climate-data';

/** Rainfall effects are drawn filled; temperature effects as dashed outlines. */
export type Effect = 'wetter' | 'drier' | 'warmer' | 'cooler';

export interface Region {
  name: string;
  /** Schematic ellipse in degrees: [lon, lat] centre (lon −180…180) and [lon, lat] radii. */
  center: [number, number];
  radii: [number, number];
}

export interface Impact {
  region: RegionId;
  effect: Effect;
  /** One sentence. */
  text: string;
}

/**
 * Typical December–February impacts, simplified from NOAA Climate Prediction Center's
 * ENSO impact maps. Shapes are deliberately loose: they mark where, not exact borders.
 */
export const REGIONS = {
  'southern-africa': { name: 'Southern Africa', center: [28, -21], radii: [10, 8] },
  'east-africa': { name: 'Equatorial East Africa', center: [37, -2], radii: [6, 6] },
  maritime: {
    name: 'Indonesia, the Philippines and northern Australia',
    center: [125, -3],
    radii: [20, 12],
  },
  'central-pacific': { name: 'Central equatorial Pacific', center: [178, 0], radii: [14, 5] },
  canada: { name: 'Western Canada and the northern US', center: [-112, 55], radii: [20, 6] },
  'southern-us': { name: 'Southern US and northern Mexico', center: [-97, 30], radii: [16, 5.5] },
  'ecuador-peru': { name: 'Coastal Ecuador and northern Peru', center: [-80, -4], radii: [3.5, 5] },
  'northern-south-america': { name: 'Northern South America', center: [-63, 4], radii: [13, 6] },
  'southeast-south-america': {
    name: 'Southern Brazil, Uruguay and northeast Argentina',
    center: [-56, -29],
    radii: [8, 6],
  },
} satisfies Record<string, Region>;

export type RegionId = keyof typeof REGIONS;

/** Ordered west to east as the map reads, Africa to the Americas. */
export const IMPACTS: Record<EnsoPhase, readonly Impact[]> = {
  'el-nino': [
    {
      region: 'southern-africa',
      effect: 'drier',
      text: 'The rainy season weakens, and maize harvests suffer.',
    },
    { region: 'east-africa', effect: 'wetter', text: 'The short rains run heavier in Kenya and Tanzania.' },
    {
      region: 'maritime',
      effect: 'drier',
      text: 'Drought sets in as the rain clouds follow the warm water east.',
    },
    {
      region: 'central-pacific',
      effect: 'wetter',
      text: 'Storms build over islands that are usually dry.',
    },
    { region: 'canada', effect: 'warmer', text: 'Winters run milder, with fewer Arctic outbreaks.' },
    {
      region: 'southern-us',
      effect: 'wetter',
      text: 'A stronger subtropical jet stream steers storms across the region, bringing a wetter, cooler winter.',
    },
    {
      region: 'ecuador-peru',
      effect: 'wetter',
      text: 'Heavy rain falls on a normally arid coast as warm water sits offshore.',
    },
    {
      region: 'northern-south-america',
      effect: 'drier',
      text: 'Drier conditions raise drought and fire risk from Colombia to the Amazon.',
    },
    {
      region: 'southeast-south-america',
      effect: 'wetter',
      text: 'Heavier rain swells rivers and floods lowlands.',
    },
  ],
  'la-nina': [
    { region: 'southern-africa', effect: 'wetter', text: 'The rainy season runs wetter than normal.' },
    {
      region: 'east-africa',
      effect: 'drier',
      text: 'The short rains fail, bringing drought to the Horn of Africa.',
    },
    {
      region: 'maritime',
      effect: 'wetter',
      text: 'Rain intensifies and floods follow, as in Queensland in 2010–11.',
    },
    {
      region: 'central-pacific',
      effect: 'drier',
      text: 'Cooler water suppresses storms over the central Pacific.',
    },
    {
      region: 'canada',
      effect: 'cooler',
      text: 'Winters turn colder across western Canada and the northern Plains.',
    },
    {
      region: 'southern-us',
      effect: 'drier',
      text: 'Storms track farther north, leaving the South drier and often warmer.',
    },
    {
      region: 'northern-south-america',
      effect: 'wetter',
      text: 'Heavier rain brings flooding to Colombia and Venezuela.',
    },
    {
      region: 'southeast-south-america',
      effect: 'drier',
      text: 'Dry spells threaten soy and maize harvests in Argentina.',
    },
  ],
};

export const EFFECT_LABEL: Record<Effect, string> = {
  wetter: 'Wetter',
  drier: 'Drier',
  warmer: 'Warmer',
  cooler: 'Cooler',
};
