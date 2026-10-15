import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, signal } from '@angular/core';
import { EnsoEpisode, EnsoPhase, formatMonth } from '../../../core/data/climate-data';
import { injectElementWidth } from '../../../core/dom/element-width';
import { RevealDirective } from '../../../shared/reveal/reveal.directive';

type NumericKey = 'peak' | 'months' | 'nino12' | 'nino4' | 'area' | 'indianOcean';

interface Axis {
  key: NumericKey;
  /** Label lines, phase-aware. */
  lines: (phase: EnsoPhase) => string[];
  format: (value: number) => string;
}

const degrees = (v: number) => `${v.toFixed(1)}\u00a0°C`;

/**
 * Clockwise from the top. Coastal Peru sits east (right) and the central Pacific west (left),
 * so eastern- and central-Pacific events lean in the direction they actually lie.
 */
const AXES: readonly Axis[] = [
  { key: 'peak', lines: () => ['Peak', 'strength'], format: degrees },
  {
    key: 'nino12',
    lines: (p) => ['Coastal Peru', p === 'el-nino' ? 'warmth' : 'chill'],
    format: degrees,
  },
  {
    key: 'area',
    lines: (p) => [p === 'el-nino' ? 'Warm-water' : 'Cold-water', 'area'],
    format: (v) => `${v.toFixed(0)}\u00a0M km²`,
  },
  { key: 'months', lines: () => ['Duration'], format: (v) => `${v}\u00a0months` },
  { key: 'indianOcean', lines: () => ['Indian Ocean', 'echo'], format: degrees },
  {
    key: 'nino4',
    lines: (p) => ['Central Pacific', p === 'el-nino' ? 'warmth' : 'chill'],
    format: degrees,
  },
];

const DEFAULTS: Record<EnsoPhase, string[]> = {
  'el-nino': ['1982–83', '1997–98', '2015–16', '2023–24'],
  'la-nina': ['1973–74', '1988–89', '1998–01', '2010–11'],
};

const MAX_SELECTED = 4;

/**
 * Compare ENSO episodes on six measures. Every axis runs from zero to the largest value any
 * episode of the same phase reached, so the outer ring is that phase's record.
 */
@Component({
  selector: 'el-episode-radar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './episode-radar.component.html',
  styleUrl: './episode-radar.component.scss',
})
export class EpisodeRadarComponent {
  /** All episodes; the component shows those of `phase`. */
  readonly episodes = input.required<readonly EnsoEpisode[]>();
  readonly phase = input.required<EnsoPhase>();

  protected readonly axes = AXES;
  protected readonly formatMonth = formatMonth;

  protected readonly width = injectElementWidth();
  protected readonly hovered = signal<string | null>(null);

  protected readonly pool = computed(() => this.episodes().filter((e) => e.phase === this.phase()));

  /** Selected episode ids in selection order; the order fixes each one's colour slot. */
  protected readonly selected = linkedSignal(() => {
    const ids = new Set(this.pool().map((e) => e.id));
    return DEFAULTS[this.phase()].filter((id) => ids.has(id));
  });

  protected readonly selectedEpisodes = computed(() => {
    const byId = new Map(this.pool().map((e) => [e.id, e]));
    return this.selected()
      .map((id, slot) => ({ episode: byId.get(id)!, slot }))
      .filter((s) => s.episode);
  });

  /** Radar diameter: full width when stacked, about half beside the table. */
  protected readonly size = computed(() => {
    const w = this.width();
    return Math.round(w < 860 ? Math.min(w, 520) : Math.min(w * 0.52, 540));
  });
  /** Phones stack labels one word per line, so the radar can stay larger. */
  protected readonly compact = computed(() => this.size() < 420);
  private readonly margin = computed(() => (this.compact() ? 68 : 76));
  protected readonly centre = computed(() => this.size() / 2);
  protected readonly radius = computed(() => this.size() / 2 - this.margin());

  private readonly maxima = computed(() => {
    const max = {} as Record<NumericKey, number>;
    for (const axis of AXES) {
      max[axis.key] = Math.max(...this.pool().map((e) => e[axis.key]), 1e-6);
    }
    return max;
  });

  protected readonly rings = computed(() =>
    [0.25, 0.5, 0.75, 1].map((f) => this.polygon(AXES.map(() => f))),
  );

  protected readonly spokes = computed(() =>
    AXES.map((axis, i) => {
      const lines = this.compact() ? axis.lines(this.phase()).join(' ').split(' ') : axis.lines(this.phase());
      const [x, y] = this.point(i, 1);
      const [lx, ly] = this.point(i, 1, 14);
      const cos = Math.cos(this.angle(i));
      const sin = Math.sin(this.angle(i));
      return {
        key: axis.key,
        x,
        y,
        lx,
        ly,
        anchor: cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle',
        // Lift labels above the top spoke, drop them below the bottom one.
        dy: sin < -0.5 ? -(lines.length - 1) * 1.15 - 0.2 : sin > 0.5 ? 0.9 : 0.35 - (lines.length - 1) * 0.5,
        lines,
      };
    }),
  );

  protected readonly series = computed(() =>
    this.selectedEpisodes().map(({ episode, slot }) => {
      const fractions = AXES.map((axis) =>
        Math.max(0, Math.min(1, episode[axis.key] / this.maxima()[axis.key])),
      );
      return {
        id: episode.id,
        slot,
        path: this.polygon(fractions),
        vertices: fractions.map((f, i) => this.point(i, f)),
      };
    }),
  );

  protected readonly table = computed(() =>
    AXES.map((axis) => ({
      label: axis.lines(this.phase()).join(' '),
      cells: this.selectedEpisodes().map(({ episode }) => axis.format(episode[axis.key])),
    })),
  );

  protected readonly ariaLabel = computed(
    () =>
      `Radar chart comparing ${this.phase() === 'el-nino' ? 'El Niño' : 'La Niña'} episodes ` +
      `${this.selected().join(', ')} on six measures. Values are listed in the table that follows.`,
  );

  protected isSelected(id: string): boolean {
    return this.selected().includes(id);
  }

  protected slotOf(id: string): number {
    return this.selected().indexOf(id);
  }

  /** Adds or removes an episode. Adding a fifth drops the earliest pick. */
  protected toggle(id: string): void {
    this.selected.update((ids) => {
      if (ids.includes(id)) return ids.length > 1 ? ids.filter((x) => x !== id) : ids;
      const next = [...ids, id];
      return next.length > MAX_SELECTED ? next.slice(next.length - MAX_SELECTED) : next;
    });
  }

  private angle(i: number): number {
    return -Math.PI / 2 + (i * 2 * Math.PI) / AXES.length;
  }

  private point(i: number, fraction: number, offset = 0): [number, number] {
    const r = this.radius() * fraction + offset;
    return [this.centre() + r * Math.cos(this.angle(i)), this.centre() + r * Math.sin(this.angle(i))];
  }

  private polygon(fractions: number[]): string {
    return fractions.map((f, i) => `${i ? 'L' : 'M'}${this.point(i, f).join(',')}`).join('') + 'Z';
  }
}
