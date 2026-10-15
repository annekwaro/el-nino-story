import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DecadePhaseCount } from '../../../core/data/climate-data';
import { RevealDirective } from '../../../shared/reveal/reveal.directive';

type Mode = 'share' | 'months';
type Segment = 'elNino' | 'neutral' | 'laNina';

const MONTHS_PER_DECADE = 120;
const SEGMENTS: readonly { key: Segment; name: string }[] = [
  { key: 'elNino', name: 'El Niño' },
  { key: 'neutral', name: 'Neutral' },
  { key: 'laNina', name: 'La Niña' },
];

/** One stacked bar per decade: El Niño, neutral and La Niña months. */
@Component({
  selector: 'el-decade-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './decade-stack.component.html',
  styleUrl: './decade-stack.component.scss',
})
export class DecadeStackComponent {
  readonly decades = input.required<readonly DecadePhaseCount[]>();
  /** Last month of data, for the partial-decade note. */
  readonly through = input.required<string>();

  protected readonly segments = SEGMENTS;
  protected readonly mode = signal<Mode>('share');
  protected readonly active = signal<{ row: number; key: Segment } | null>(null);

  protected readonly rows = computed(() =>
    this.decades().map((d) => {
      const total = d.elNino + d.neutral + d.laNina;
      const base = this.mode() === 'share' ? total : MONTHS_PER_DECADE;
      return {
        decade: d.decade,
        label: `${d.decade}s`,
        partial: total < MONTHS_PER_DECADE,
        total,
        parts: SEGMENTS.map((s) => ({
          key: s.key,
          name: s.name,
          months: d[s.key],
          share: Math.round((d[s.key] / total) * 100),
          width: (d[s.key] / base) * 100,
        })),
      };
    }),
  );

  protected readonly readout = computed(() => {
    const a = this.active();
    if (!a) return null;
    const row = this.rows()[a.row];
    const part = row.parts.find((p) => p.key === a.key)!;
    return `${row.label}${row.partial ? ' so far' : ''}: ${part.name} in ${part.months} of ${row.total} months (${part.share}%)`;
  });
}
