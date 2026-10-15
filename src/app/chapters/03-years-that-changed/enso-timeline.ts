import { EnsoPhase } from '../../core/data/climate-data';

export interface TimelineEvent {
  years: string;
  phase: EnsoPhase;
  title: string;
  /** One sentence, present tense. */
  text: string;
}

export const TIMELINE: readonly TimelineEvent[] = [
  {
    years: '1982–83',
    phase: 'el-nino',
    title: 'One of the strongest on record',
    text: 'It arrives almost unforecast, flooding the coastal deserts of Peru and Ecuador while drought and bushfires sweep southeastern Australia.',
  },
  {
    years: '1988–89',
    phase: 'la-nina',
    title: 'Drought in the American heartland',
    text: 'A sharp La Niña helps drive the worst US drought since the Dust Bowl, withering the Corn Belt’s harvest.',
  },
  {
    years: '1997–98',
    phase: 'el-nino',
    title: 'The strongest of the 20th century',
    text: 'Indonesia’s forests burn under a haze that blankets Southeast Asia, and the world sees its first global coral bleaching event.',
  },
  {
    years: '1998–99',
    phase: 'la-nina',
    title: 'A long cool-down',
    text: 'La Niña lingers into 2001, pulling global temperatures back down from 1998’s record high.',
  },
  {
    years: '2010–11',
    phase: 'la-nina',
    title: 'Catastrophic floods in Queensland',
    text: 'Floodwaters cover an area of Queensland larger than France and Germany combined, and Brisbane goes under in January 2011.',
  },
  {
    years: '2015–16',
    phase: 'el-nino',
    title: 'A rival to 1997',
    text: 'Marine heat bleaches the Great Barrier Reef on a scale never seen before, and 2016 becomes the hottest year yet recorded.',
  },
  {
    years: '2020–23',
    phase: 'la-nina',
    title: 'A rare triple dip',
    text: 'La Niña holds for a third year running, only the third triple dip since 1950, deepening a historic drought in the Horn of Africa.',
  },
  {
    years: '2023–24',
    phase: 'el-nino',
    title: 'The most recent strong event',
    text: 'It follows hard on the triple dip and helps push 2023, then 2024, to the hottest years on record.',
  },
];
