import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { formatAnomaly, formatMonth } from '../../core/data/climate-data';
import { ClimateDataService } from '../../core/data/climate-data.service';
import { RevealDirective } from '../../shared/reveal/reveal.directive';
import { DecadeStackComponent } from './decade-stack/decade-stack.component';
import { GlobalSstChartComponent, trendLine } from './global-sst-chart/global-sst-chart.component';

@Component({
  selector: 'el-what-comes-next',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecadeStackComponent, GlobalSstChartComponent, RevealDirective],
  templateUrl: './what-comes-next.component.html',
  styleUrl: './what-comes-next.component.scss',
})
export class WhatComesNextComponent {
  protected readonly data = inject(ClimateDataService);

  protected readonly errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

  /** Last month counted, from the latest episode-file decade. */
  protected readonly through = computed(() => {
    const months = this.data.nino12.value()?.months;
    return months ? formatMonth(months[months.length - 1].month) : 'the latest data';
  });

  protected readonly shares = computed(() => {
    const decades = this.data.episodes.value()?.decades;
    if (!decades?.length) return null;
    const sum = (k: 'elNino' | 'laNina' | 'neutral') => decades.reduce((s, d) => s + d[k], 0);
    const total = sum('elNino') + sum('laNina') + sum('neutral');
    const latest = decades[decades.length - 1];
    const latestTotal = latest.elNino + latest.laNina + latest.neutral;
    return {
      elNino: Math.round((sum('elNino') / total) * 100),
      laNina: Math.round((sum('laNina') / total) * 100),
      neutral: Math.round((sum('neutral') / total) * 100),
      latestDecade: `${latest.decade}s`,
      latestLaNina: Math.round((latest.laNina / latestTotal) * 100),
    };
  });

  protected readonly warming = computed(() => {
    const years = this.data.globalSst.value()?.years;
    if (!years?.length) return null;
    const { slope, intercept } = trendLine(years);
    const first = years[0].year;
    const last = years[years.length - 1].year;
    const residual = (phase: string) => {
      const set = years.filter((y) => y.phase === phase);
      return set.reduce((s, y) => s + (y.anomaly - (slope * y.year + intercept)), 0) / set.length;
    };
    const warmest = years.reduce((a, b) => (b.anomaly > a.anomaly ? b : a));

    // Years since 1980 that beat every year before them.
    const records: typeof years = [];
    let best = -Infinity;
    for (const y of years) {
      if (y.anomaly > best) {
        best = y.anomaly;
        if (y.year >= 1980) records.push(y);
      }
    }
    const elNinoStarts = new Set(
      (this.data.episodes.value()?.episodes ?? [])
        .filter((e) => e.phase === 'el-nino')
        .map((e) => Number(e.start.slice(0, 4))),
    );
    const building = records.filter((y) => y.phase !== 'el-nino' && elNinoStarts.has(y.year)).map((y) => y.year);

    return {
      first,
      last,
      perDecade: formatAnomaly(slope * 10, 2),
      total: formatAnomaly(slope * (last - first), 1),
      elNino: formatAnomaly(residual('el-nino'), 2),
      laNina: formatAnomaly(residual('la-nina'), 2),
      warmest: warmest.year,
      warmestValue: formatAnomaly(warmest.anomaly, 2),
      records: records.length,
      recordsElNino: records.filter((y) => y.phase === 'el-nino').length,
      building: listYears(building),
    };
  });
}

/** [1997, 2009, 2023] → '1997, 2009 and 2023' */
function listYears(years: number[]): string {
  if (years.length < 2) return years.join('');
  return `${years.slice(0, -1).join(', ')} and ${years[years.length - 1]}`;
}
