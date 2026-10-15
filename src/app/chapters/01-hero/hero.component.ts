import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { area, curveBasis, line, scaleLinear } from 'd3';
import { formatAnomaly, formatMonth } from '../../core/data/climate-data';
import { ClimateDataService } from '../../core/data/climate-data.service';
import { injectElementSize } from '../../core/dom/element-width';

/** Vertical scale, as fractions of the chart height: highest value 4% from the top, lowest 4% from the bottom. */
const TOP = 8 / 200;
const BOTTOM = 192 / 200;
/** The chart runs 2% past each side of the screen. */
const BLEED = 0.02;
/** Peaks must be this many months apart to be labelled separately. */
const PEAK_SEPARATION = 48;

/**
 * Opening image: the Niño 3.4 index since 1950 as one wave filling the screen, warm above
 * the line and cool below, with the title set into the quiet water of the 1950s.
 */
@Component({
  selector: 'el-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent {
  protected readonly index = inject(ClimateDataService).nino34;
  protected readonly hoverIndex = signal<number | null>(null);

  private readonly host = injectElementSize();
  /** Chart size in px, including the bleed. */
  protected readonly size = computed(() => ({
    width: Math.round(this.host().width * (1 + 2 * BLEED)),
    height: this.host().height,
  }));

  private readonly months = computed(() => this.index.value()?.months ?? []);
  protected readonly count = computed(() => this.months().length);

  /** 3-month centred mean, as in NOAA's Oceanic Niño Index: smooth, but true to the record. */
  private readonly smooth = computed(() => {
    const m = this.months();
    return m.map((_, i) => {
      const window = m.slice(Math.max(0, i - 1), i + 2);
      return window.reduce((s, e) => s + e.anomaly, 0) / window.length;
    });
  });

  private readonly x = computed(() => {
    const n = this.count();
    const w = this.size().width;
    return (i: number) => ((i + 0.5) / n) * w;
  });

  private readonly y = computed(() => {
    const values = this.smooth();
    const h = this.size().height;
    return scaleLinear()
      .domain([Math.min(...values), Math.max(...values)])
      .range([h * BOTTOM, h * TOP]);
  });

  protected readonly paths = computed(() => {
    const values = this.smooth();
    const x = this.x();
    const y = this.y();
    const fill = (clip: (v: number) => number) =>
      area<number>()
        .x((_, i) => x(i))
        .y0(y(0))
        .y1((v) => y(clip(v)))
        .curve(curveBasis)(values) ?? '';
    return {
      line: line<number>().x((_, i) => x(i)).y(y).curve(curveBasis)(values) ?? '',
      warm: fill((v) => Math.max(0, v)),
      cool: fill((v) => Math.min(0, v)),
      zero: y(0),
    };
  });

  protected readonly span = computed(() => {
    const m = this.months();
    return m.length ? [m[0].month.slice(0, 4), m[m.length - 1].month.slice(0, 4)] : ['', ''];
  });

  /** The two highest peaks. */
  protected readonly peaks = computed(() => {
    const values = this.smooth();
    const ranked = values.map((v, i) => ({ i, v })).sort((a, b) => b.v - a.v);
    const chosen: { i: number; v: number }[] = [];
    for (const p of ranked) {
      if (chosen.every((c) => Math.abs(c.i - p.i) >= PEAK_SEPARATION)) chosen.push(p);
      if (chosen.length === 2) break;
    }
    return chosen.map(({ i, v }) => ({ ...this.place(i, v), year: this.months()[i].month.slice(0, 4) }));
  });

  /** Labels appear in time order, 1997 then 2015. */
  protected readonly peaksByYear = computed(() => [...this.peaks()].sort((a, b) => a.x - b.x));

  protected readonly readout = computed(() => {
    const i = this.hoverIndex();
    if (i === null || !this.months()[i]) return null;
    const v = this.smooth()[i];
    return { ...this.place(i, v), text: `${formatMonth(this.months()[i].month)}  ${formatAnomaly(v)}` };
  });

  protected readonly ariaLabel = computed(
    () =>
      `The Pacific's Niño 3.4 temperature from ${this.span()[0]} to ${this.span()[1]}, rising above ` +
      `normal in El Niño years and falling below in La Niña years. Highest peaks: ` +
      this.peaks()
        .map((p) => `${p.year}, ${p.value}`)
        .join('; ') +
      '.',
  );

  /** The chart sits under everything, so read the pointer against its box. */
  protected onPointer(event: PointerEvent, chart: Element): void {
    const n = this.count();
    if (!n) return;
    const rect = chart.getBoundingClientRect();
    const i = Math.floor(((event.clientX - rect.left) / rect.width) * n);
    this.hoverIndex.set(i >= 0 && i < n ? i : null);
  }

  private place(i: number, v: number) {
    return { x: this.x()(i), y: this.y()(v), value: formatAnomaly(v), warm: v >= 0 };
  }
}
