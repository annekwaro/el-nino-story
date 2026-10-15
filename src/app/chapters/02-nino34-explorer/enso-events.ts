import { EnsoPhase, MonthKey } from '../../core/data/climate-data';

export interface EnsoEvent {
  month: MonthKey;
  phase: EnsoPhase;
  label: string;
  /** 1–2 sentences. Placeholder until the real narration is written. */
  caption: string;
}

const placeholder = (year: number) =>
  `Placeholder narration for ${year}. One or two sentences about this event go here.`;

/**
 * Curated events, in chronological order. Each month is checked against
 * nino34-index.json at runtime; any that are missing are disabled and logged.
 */
export const ENSO_EVENTS: readonly EnsoEvent[] = [
  { month: '1982-12', phase: 'el-nino', label: 'Strong El Niño', caption: placeholder(1982) },
  { month: '1983-12', phase: 'la-nina', label: 'The La Niña that followed', caption: placeholder(1983) },
  { month: '1988-12', phase: 'la-nina', label: 'Strong La Niña', caption: placeholder(1988) },
  { month: '1997-12', phase: 'el-nino', label: 'Strongest El Niño on record', caption: placeholder(1997) },
  { month: '1998-12', phase: 'la-nina', label: 'Strong La Niña', caption: placeholder(1998) },
  { month: '2010-12', phase: 'la-nina', label: 'Strong La Niña', caption: placeholder(2010) },
  { month: '2015-12', phase: 'el-nino', label: 'Strong El Niño', caption: placeholder(2015) },
  { month: '2016-12', phase: 'la-nina', label: 'Turning to La Niña', caption: placeholder(2016) },
  { month: '2020-12', phase: 'la-nina', label: 'La Niña', caption: placeholder(2020) },
  { month: '2023-12', phase: 'el-nino', label: 'Recent El Niño', caption: placeholder(2023) },
];
