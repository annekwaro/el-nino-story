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
      'A red band runs the length of the equatorial Pacific, and no forecast saw it coming. The surprise sets scientists building the buoy network that now spots each new El Niño months ahead.',
  },
  {
    month: '1983-12',
    phase: 'la-nina',
    label: 'The swing back',
    caption:
      'A year on, the eastern Pacific has swung cold. The rain that failed Indonesia and northern Australia during the El Niño comes back.',
  },
  {
    month: '1988-12',
    phase: 'la-nina',
    label: 'Strong La Niña',
    caption:
      'Cold water stretches far out across the equatorial Pacific in one of the deepest La Niñas on record. The same cooling helped set up that year’s US drought, the worst since the Dust Bowl.',
  },
  {
    month: '1997-12',
    phase: 'el-nino',
    label: 'The century’s strongest El Niño',
    caption:
      'Heat piles against the coast of South America in the strongest El Niño of the 20th century. The warm water it spreads sets off the first coral bleaching seen around the whole globe.',
  },
  {
    month: '1998-12',
    phase: 'la-nina',
    label: 'Strong La Niña',
    caption:
      'The red is gone, replaced by a cold tongue that lingers until 2001. While it holds, the world cools back from the record heat of 1998.',
  },
  {
    month: '2010-12',
    phase: 'la-nina',
    label: 'Strong La Niña',
    caption:
      'A deep cold pool fills the central Pacific while warm water crowds north of Australia. Within weeks Queensland floods, and in January 2011 the river runs through Brisbane.',
  },
  {
    month: '2015-12',
    phase: 'el-nino',
    label: 'Strong El Niño',
    caption:
      'The heat rivals 1997 and, in Niño 3.4, passes it, though it sits farther west. Months later, marine heat bleaches the Great Barrier Reef more severely than ever recorded.',
  },
  {
    month: '2016-12',
    phase: 'la-nina',
    label: 'A brief La Niña',
    caption:
      'A weak La Niña cools the Pacific at the end of a year that sets a new record for global heat.',
  },
  {
    month: '2020-12',
    phase: 'la-nina',
    label: 'La Niña',
    caption:
      'Cold water spreads along the equator at the start of a rare triple-dip La Niña. Across the Horn of Africa, the first of several failed rainy seasons begins.',
  },
  {
    month: '2023-12',
    phase: 'el-nino',
    label: 'Recent El Niño',
    caption:
      'The warm band returns across the Pacific in the most recent strong El Niño. Its heat helps carry 2023 and then 2024 to the warmest years on record.',
  },
];
