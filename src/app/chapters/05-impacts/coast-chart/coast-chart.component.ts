import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { area, scaleLinear, scaleTime, timeYear } from 'd3';
import { Nino34Month, formatAnomaly, formatMonth, monthToDate } from '../../../core/data/climate-data';
import { injectElementWidth } from '../../../core/dom/element-width';
import { RevealDirective } from '../../../shared/reveal/reveal.directive';

const MARGIN = { top: 28, right: 12, bottom: 28, left: 40 };
/** Peaks must be this many months apart to be labelled separately. */
const PEAK_SEPARATION = 36;

/**
 * Monthly Niño 1+2 anomaly (the sea off coastal Peru) as a warm/cool area,
 * with its largest warm spikes labelled and a hover readout.
 */
@Component({
  selector: 'el-coast-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './coast-chart.component.html',
  styleUrl: './coast-chart.component.scss',
})
export class CoastChartComponent {
  readonly months = input.required<readonly Nino34Month[]>();

  protected readonly margin = MARGIN;
  protected readonly width = injectElementWidth();
  protected readonly height = computed(() => (this.width() < 560 ? 220 : 300));
  protected readonly hoverIndex = signal<number | null>(null);

  private readonly dates = computed(() => this.months().map((m) => monthToDate(m.month)));

  private readonly x = computed(() =>
    scaleTime()
      .domain([this.dates()[0], this.dates()[this.dates().length - 1]])
      .range([MARGIN.left, this.width() - MARGIN.right]),
  );

  private readonly y = computed(() => {
    const values = this.months().map((m) => m.anomaly);
    return scaleLinear()
      .domain([Math.min(...values), Math.max(...values)])
      .range([this.height() - MARGIN.bottom, MARGIN.top])
      .nice();
  });

  protected readonly zeroY = computed(() => this.y()(0));

  /** The same curve clipped at zero: warm above, cool below. */
  protected readonly areas = computed(() => {
    const x = this.x();
    const y = this.y();
    const dates = this.dates();
    const shape = (clip: (v: number) => number) =>
      area<Nino34Month>()
        .x((_, i) => x(dates[i]))
        .y0(y(0))
        .y1((m) => y(clip(m.anomaly)))(this.months() as Nino34Month[]) ?? '';
    return { warm: shape((v) => Math.max(0, v)), cool: shape((v) => Math.min(0, v)) };
  });

  protected readonly xTicks = computed(() =>
    this.x()
      .ticks(timeYear.every(this.width() < 560 ? 20 : 10)!)
      .map((d) => ({ x: this.x()(d), label: d.getFullYear() })),
  );

  protected readonly yTicks = computed(() =>
    this.y()
      .ticks(5)
      .map((value) => ({ value, y: this.y()(value), label: formatAnomaly(value, 0, '°') })),
  );

  /** The three largest warm peaks, at least PEAK_SEPARATION months apart, labelled by year. */
  protected readonly peaks = computed(() => {
    const ranked = this.months()
      .map((m, i) => ({ i, v: m.anomaly }))
      .sort((a, b) => b.v - a.v);
    const chosen: { i: number; v: number }[] = [];
    for (const p of ranked) {
      if (chosen.every((c) => Math.abs(c.i - p.i) >= PEAK_SEPARATION)) chosen.push(p);
      if (chosen.length === 3) break;
    }
    return chosen.map(({ i, v }) => {
      const x = this.x()(this.dates()[i]);
      return {
        x,
        y: this.y()(v),
        label: `${formatMonth(this.months()[i].month)} ${formatAnomaly(v)}`,
        // Keep labels inside the frame near either edge.
        anchor: x > this.width() - 80 ? 'end' : x < 80 ? 'start' : 'middle',
      };
    });
  });

  protected readonly hover = computed(() => {
    const i = this.hoverIndex();
    if (i === null) return null;
    const m = this.months()[i];
    const x = this.x()(this.dates()[i]);
    return {
      x,
      y: this.y()(m.anomaly),
      warm: m.anomaly >= 0,
      text: `${formatMonth(m.month)}  ${formatAnomaly(m.anomaly)}`,
      anchor: x > this.width() - 120 ? 'end' : x < 120 ? 'start' : 'middle',
    };
  });

  protected readonly ariaLabel = computed(() => {
    const m = this.months();
    return (
      `Monthly sea-surface temperature anomaly off coastal Peru (Niño 1+2), ${formatMonth(m[0].month)} ` +
      `to ${formatMonth(m[m.length - 1].month)}. Largest warm peaks: ` +
      this.peaks()
        .map((p) => p.label)
        .join('; ') +
      '.'
    );
  });

  protected onPointer(event: PointerEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const px = event.clientX - svg.getBoundingClientRect().left;
    const date = this.x().invert(px);
    const first = this.dates()[0];
    const index = (date.getFullYear() - first.getFullYear()) * 12 + (date.getMonth() - first.getMonth());
    this.hoverIndex.set(Math.max(0, Math.min(this.months().length - 1, index)));
  }
}
