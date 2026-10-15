import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { scaleBand, scaleLinear } from 'd3';
import { GlobalSstYear, formatAnomaly } from '../../../core/data/climate-data';
import { injectElementWidth } from '../../../core/dom/element-width';
import { RevealDirective } from '../../../shared/reveal/reveal.directive';

const MARGIN = { top: 24, right: 12, bottom: 28, left: 44 };

const PHASE_NAME = { 'el-nino': 'El Niño', 'la-nina': 'La Niña', neutral: 'neutral' } as const;

/** Least-squares line through (year, anomaly). */
export function trendLine(years: readonly GlobalSstYear[]): { slope: number; intercept: number } {
  const n = years.length;
  const mx = years.reduce((s, y) => s + y.year, 0) / n;
  const my = years.reduce((s, y) => s + y.anomaly, 0) / n;
  let num = 0;
  let den = 0;
  for (const y of years) {
    num += (y.year - mx) * (y.anomaly - my);
    den += (y.year - mx) ** 2;
  }
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}

/** Annual near-global ocean temperature anomaly, one bar per year coloured by ENSO phase. */
@Component({
  selector: 'el-global-sst-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './global-sst-chart.component.html',
  styleUrl: './global-sst-chart.component.scss',
})
export class GlobalSstChartComponent {
  readonly years = input.required<readonly GlobalSstYear[]>();

  protected readonly margin = MARGIN;
  protected readonly width = injectElementWidth();
  protected readonly height = computed(() => (this.width() < 560 ? 240 : 320));
  protected readonly hoverIndex = signal<number | null>(null);

  private readonly x = computed(() =>
    scaleBand<number>()
      .domain(this.years().map((y) => y.year))
      .range([MARGIN.left, this.width() - MARGIN.right])
      .paddingInner(this.width() < 560 ? 0.1 : 0.2),
  );

  private readonly y = computed(() => {
    const values = this.years().map((y) => y.anomaly);
    return scaleLinear()
      .domain([Math.min(0, ...values), Math.max(0, ...values)])
      .range([this.height() - MARGIN.bottom, MARGIN.top])
      .nice();
  });

  protected readonly zeroY = computed(() => this.y()(0));

  protected readonly bars = computed(() => {
    const x = this.x();
    const y = this.y();
    const y0 = y(0);
    return this.years().map((d) => ({
      year: d.year,
      phase: d.phase,
      x: x(d.year)!,
      width: x.bandwidth(),
      y: Math.min(y(d.anomaly), y0),
      height: Math.abs(y(d.anomaly) - y0),
    }));
  });

  protected readonly trend = computed(() => {
    const { slope, intercept } = trendLine(this.years());
    const first = this.years()[0].year;
    const last = this.years()[this.years().length - 1].year;
    const x = this.x();
    const half = x.bandwidth() / 2;
    return {
      x1: x(first)! + half,
      y1: this.y()(slope * first + intercept),
      x2: x(last)! + half,
      y2: this.y()(slope * last + intercept),
    };
  });

  protected readonly yTicks = computed(() =>
    this.y()
      .ticks(5)
      .map((value) => ({ value, y: this.y()(value), label: formatAnomaly(value, 1, '°') })),
  );

  protected readonly xTicks = computed(() => {
    const step = this.width() < 560 ? 20 : 10;
    const x = this.x();
    return this.years()
      .filter((y) => y.year % step === 0)
      .map((y) => ({ x: x(y.year)! + x.bandwidth() / 2, label: y.year }));
  });

  protected readonly hover = computed(() => {
    const i = this.hoverIndex();
    if (i === null) return null;
    const bar = this.bars()[i];
    const d = this.years()[i];
    const cx = bar.x + bar.width / 2;
    return {
      x: cx,
      anchor: cx > this.width() - 140 ? 'end' : cx < 140 ? 'start' : 'middle',
      text: `${d.year}  ${formatAnomaly(d.anomaly, 2)} · ${PHASE_NAME[d.phase]} winter`,
    };
  });

  protected readonly ariaLabel = computed(() => {
    const ys = this.years();
    const last = ys[ys.length - 1];
    return (
      `Annual sea-surface temperature anomaly between 60°S and 60°N, ${ys[0].year} to ${last.year}, ` +
      `against 1991–2020. ${last.year}: ${formatAnomaly(last.anomaly, 2)}. ` +
      `Bars are coloured by the ENSO phase of the winter that opened each year.`
    );
  });

  protected onPointer(event: PointerEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const px = event.clientX - svg.getBoundingClientRect().left;
    const x = this.x();
    const step = x.step();
    const index = Math.floor((px - MARGIN.left + (step - x.bandwidth()) / 2) / step);
    this.hoverIndex.set(index >= 0 && index < this.years().length ? index : null);
  }
}
