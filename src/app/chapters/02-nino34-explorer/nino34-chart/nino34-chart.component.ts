import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { path, scaleLinear, scaleTime, timeYear } from 'd3';
import {
  MonthKey,
  Nino34Month,
  formatAnomaly,
  formatMonth,
  monthToDate,
  nextMonth,
} from '../../../core/data/climate-data';
import { injectElementWidth } from '../../../core/dom/element-width';
import { EnsoEvent } from '../enso-events';

const MARGIN = { top: 40, right: 8, bottom: 28, left: 40 };

/**
 * Monthly Niño 3.4 bars with clickable event markers.
 * D3 builds scales and path strings; Angular owns every DOM node.
 */
@Component({
  selector: 'el-nino34-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nino34-chart.component.html',
  styleUrl: './nino34-chart.component.scss',
})
export class Nino34ChartComponent {
  readonly months = input.required<readonly Nino34Month[]>();
  readonly events = input.required<readonly EnsoEvent[]>();
  readonly selectedMonth = input.required<MonthKey>();
  /** Event months missing from the index; their markers aren't drawn. */
  readonly unavailable = input<ReadonlySet<MonthKey>>(new Set());
  readonly eventSelect = output<number>();

  protected readonly margin = MARGIN;
  protected readonly width = injectElementWidth();
  protected readonly height = computed(() => (this.width() < 560 ? 200 : 260));
  protected readonly hovered = signal<number | null>(null);

  private readonly dates = computed(() => this.months().map((m) => monthToDate(m.month)));

  private readonly x = computed(() => {
    const months = this.months();
    const end = monthToDate(nextMonth(months[months.length - 1].month));
    return scaleTime()
      .domain([this.dates()[0], end])
      .range([MARGIN.left, this.width() - MARGIN.right]);
  });

  private readonly y = computed(() => {
    const max = Math.max(1, ...this.months().map((m) => Math.abs(m.anomaly)));
    return scaleLinear()
      .domain([-max, max])
      .range([this.height() - MARGIN.bottom, MARGIN.top])
      .nice();
  });

  /** Width of one month in px. */
  private readonly step = computed(() => {
    const [x0, x1] = this.x().range();
    return (x1 - x0) / this.months().length;
  });

  /** All warm bars as one path and all cool bars as another: two DOM nodes, not 900. */
  protected readonly bars = computed(() => {
    const x = this.x();
    const y = this.y();
    const y0 = y(0);
    const w = this.step();
    const barWidth = w > 3 ? w - 1 : w;
    const warm = path();
    const cool = path();
    this.months().forEach((m, i) => {
      const ya = y(m.anomaly);
      (m.anomaly >= 0 ? warm : cool).rect(x(this.dates()[i]), Math.min(ya, y0), barWidth, Math.abs(ya - y0));
    });
    return { warm: warm.toString(), cool: cool.toString() };
  });

  protected readonly xTicks = computed(() =>
    this.x()
      .ticks(timeYear.every(10)!)
      .map((d) => ({ x: this.x()(d), label: d.getFullYear() })),
  );

  protected readonly yTicks = computed(() =>
    this.y()
      .ticks(5)
      .map((value) => ({ value, y: this.y()(value), label: formatAnomaly(value, 0, '°') })),
  );

  protected readonly markers = computed(() =>
    this.events()
      .map((event, index) => ({ event, index, x: this.monthX(event.month) }))
      .filter(({ event }) => !this.unavailable().has(event.month)),
  );

  protected readonly selectedX = computed(() => this.monthX(this.selectedMonth()));

  protected readonly tooltip = computed(() => {
    const i = this.hovered();
    if (i === null) return null;
    const event = this.events()[i];
    const x = this.monthX(event.month);
    const anchor = x < 110 ? 'start' : x > this.width() - 110 ? 'end' : 'middle';
    return { x, anchor, text: `${formatMonth(event.month)} · ${event.label}` };
  });

  protected readonly ariaLabel = computed(() => {
    const months = this.months();
    return (
      `Monthly Niño 3.4 sea-surface temperature anomaly, ${formatMonth(months[0].month)} to ` +
      `${formatMonth(months[months.length - 1].month)}. Bars above zero are warmer than normal, ` +
      `below zero cooler. Selected: ${formatMonth(this.selectedMonth())}.`
    );
  });

  /** Centre of a month's bar. */
  private monthX(month: MonthKey): number {
    return this.x()(monthToDate(month)) + this.step() / 2;
  }
}
