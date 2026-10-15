import { EnsoPhase, MonthKey } from '../../core/data/climate-data';

export interface EnsoEvent {
  month: MonthKey;
  phase: EnsoPhase;
  label: string;
  /** 1–2 sentences, present tense. */
  caption: string;
}

/**
 * Curated events, in chronological order. Each month is checked against
 * nino34-index.json at runtime; any that are missing are disabled and logged.
 */
export const ENSO_EVENTS: readonly EnsoEvent[] = [
  {
    month: '1982-12',
    phase: 'el-nino',
    label: 'Strong El Niño',
    caption:
      'Warm water floods the eastern Pacific almost unforecast. By December the whole equatorial band glows red, and coastal Peru and Ecuador are bracing for months of rain.',
  },
  {
    month: '1983-12',
    phase: 'la-nina',
    label: 'The swing back',
    caption:
      'A year after the peak, the same patch of ocean has turned cool. El Niño’s exit often runs straight into its opposite.',
  },
  {
    month: '1988-12',
    phase: 'la-nina',
    label: 'Strong La Niña',
    caption:
      'Strengthened trade winds drag a tongue of cold water far across the Pacific. It is one of the deepest La Niñas in the record.',
  },
  {
    month: '1997-12',
    phase: 'el-nino',
    label: 'The century’s strongest El Niño',
    caption:
      'The warmest El Niño yet measured reaches its height, with its heat piled hard against South America. Peru’s coast is about to take the heaviest rains in the satellite record.',
  },
  {
    month: '1998-12',
    phase: 'la-nina',
    label: 'Strong La Niña',
    caption:
      'Within a year the warmth is gone. A La Niña sets in that will hold, on and off, until 2001.',
  },
  {
    month: '2010-12',
    phase: 'la-nina',
    label: 'Strong La Niña',
    caption:
      'One of the strongest La Niñas in decades cools the central Pacific, while record rain gathers over eastern Australia.',
  },
  {
    month: '2015-12',
    phase: 'el-nino',
    label: 'Strong El Niño',
    caption:
      'Niño 3.4 runs even warmer than in 1997, but the heat sits farther west. Coastal Peru stays surprisingly dry.',
  },
  {
    month: '2016-12',
    phase: 'la-nina',
    label: 'A brief La Niña',
    caption: 'A weak La Niña follows, cooling the Pacific for only a few months before fading.',
  },
  {
    month: '2020-12',
    phase: 'la-nina',
    label: 'La Niña',
    caption:
      'The first winter of a La Niña that will return for three in a row, a rare triple dip.',
  },
  {
    month: '2023-12',
    phase: 'el-nino',
    label: 'Recent El Niño',
    caption:
      'El Niño returns after the triple dip. The heat it releases helps push 2023 and then 2024 to the warmest years on record.',
  },
];
