import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  isDevMode,
  resource,
  signal,
} from '@angular/core';
import {
  NINO34_INDEX_URL,
  fetchJson,
  formatAnomaly,
  formatMonth,
  parseNino34Index,
  parseSstAnomaly,
  sstAnomalyUrl,
} from '../../core/data/climate-data';
import { SstMapComponent, SstMapStatus } from '../../shared/sst-map/sst-map.component';
import { ENSO_EVENTS } from './enso-events';
import { Nino34ChartComponent } from './nino34-chart/nino34-chart.component';

@Component({
  selector: 'el-nino34-explorer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Nino34ChartComponent, SstMapComponent],
  templateUrl: './nino34-explorer.component.html',
  styleUrl: './nino34-explorer.component.scss',
})
export class Nino34ExplorerComponent {
  protected readonly events = ENSO_EVENTS;
  protected readonly formatMonth = formatMonth;

  protected readonly selectedIndex = signal(0);

  protected readonly selectedEvent = computed(() => this.events[this.selectedIndex()]);
  protected readonly selectedMonth = computed(() => this.selectedEvent().month);
  protected readonly mapUrl = computed(() => sstAnomalyUrl(this.selectedMonth()));
  protected readonly narration = computed(() => this.selectedEvent().caption);

  protected readonly index = resource({
    loader: async ({ abortSignal }) =>
      parseNino34Index(await fetchJson(NINO34_INDEX_URL, abortSignal), NINO34_INDEX_URL),
  });

  protected readonly map = resource({
    request: () => ({ url: this.mapUrl(), month: this.selectedMonth() }),
    loader: async ({ request, abortSignal }) =>
      parseSstAnomaly(await fetchJson(request.url, abortSignal), request.month, request.url),
  });

  protected readonly mapStatus = computed<SstMapStatus>(() =>
    this.map.error() ? 'error' : this.map.isLoading() ? 'loading' : 'ready',
  );

  /** Curated months that aren't in the loaded index. Empty until the index loads. */
  protected readonly missingMonths = computed(() => {
    const index = this.index.value();
    if (!index) return new Set<string>();
    const present = new Set(index.months.map((m) => m.month));
    return new Set(this.events.map((e) => e.month).filter((m) => !present.has(m)));
  });

  protected readonly selectedAnomaly = computed(() => {
    const entry = this.index.value()?.months.find((m) => m.month === this.selectedMonth());
    return entry ? { text: formatAnomaly(entry.anomaly), warm: entry.anomaly >= 0 } : null;
  });

  constructor() {
    effect(() => {
      const missing = [...this.missingMonths()];
      if (missing.length && isDevMode()) {
        console.warn(`[nino34-explorer] Event months missing from ${NINO34_INDEX_URL}:`, missing);
      }
    });
  }

  protected select(index: number): void {
    this.selectedIndex.set(index);
  }

  /** Steps to the neighbouring event, skipping any whose month isn't in the data. */
  protected move(direction: -1 | 1): void {
    const target = this.neighbour(direction);
    if (target !== null) this.selectedIndex.set(target);
  }

  protected neighbour(direction: -1 | 1): number | null {
    const missing = this.missingMonths();
    for (let i = this.selectedIndex() + direction; i >= 0 && i < this.events.length; i += direction) {
      if (!missing.has(this.events[i].month)) return i;
    }
    return null;
  }

  protected errorText(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
