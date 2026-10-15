import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { EnsoPhase, formatAnomaly, formatMonth } from '../../core/data/climate-data';
import { ClimateDataService } from '../../core/data/climate-data.service';
import { PhaseToggleComponent } from '../../shared/phase-toggle/phase-toggle.component';
import { RevealDirective } from '../../shared/reveal/reveal.directive';
import { CoastChartComponent } from './coast-chart/coast-chart.component';
import { EpisodeRadarComponent } from './episode-radar/episode-radar.component';
import { RainfallMatrixComponent } from './rainfall-matrix/rainfall-matrix.component';

const percent = (v: number) => {
  const r = Math.round(v);
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)}%`;
};

@Component({
  selector: 'el-impacts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CoastChartComponent, EpisodeRadarComponent, PhaseToggleComponent, RainfallMatrixComponent, RevealDirective],
  templateUrl: './impacts.component.html',
  styleUrl: './impacts.component.scss',
})
export class ImpactsComponent {
  protected readonly data = inject(ClimateDataService);

  protected readonly radarPhase = signal<EnsoPhase>('el-nino');
  protected readonly rainPhase = signal<EnsoPhase>('el-nino');

  protected readonly errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

  /** 1997–98 vs 2015–16, the comparison the radar opens on. */
  protected readonly rivals = computed(() => {
    const episodes = this.data.episodes.value()?.episodes;
    const a = episodes?.find((e) => e.id === '1997–98');
    const b = episodes?.find((e) => e.id === '2015–16');
    if (!a || !b) return null;
    return {
      oldPeak: formatAnomaly(a.peak),
      newPeak: formatAnomaly(b.peak),
      oldCoast: formatAnomaly(a.nino12),
      newCoast: formatAnomaly(b.nino12),
    };
  });

  /** Coastal Peru's rainfall in the three big El Niño winters. */
  protected readonly peru = computed(() => {
    const winters = this.data.rainfall.value()?.winters;
    const pick = (id: string) => winters?.find((w) => w.id === id)?.anomalies['ecuador-peru'];
    const [a, b, c] = [pick('1982–83'), pick('1997–98'), pick('2015–16')];
    if (a === undefined || b === undefined || c === undefined) return null;
    return { a: percent(a), b: percent(b), c: percent(c) };
  });

  /** The most reliable rainfall signal for each phase, for the lead-in sentence. */
  protected readonly steadiest = computed(() => {
    const file = this.data.rainfall.value();
    if (!file) return null;
    const phase = this.rainPhase();
    const winters = file.winters.filter((w) => w.phase === phase);
    const best = file.regions
      .map((r) => {
        const values = winters.map((w) => w.anomalies[r.id]);
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const sameSign = values.filter((v) => Math.sign(v) === Math.sign(mean)).length;
        return { name: r.name, mean, sameSign, total: values.length };
      })
      .filter((r) => r.name !== 'Central equatorial Pacific')
      .sort((a, b) => b.sameSign / b.total - a.sameSign / a.total || Math.abs(b.mean) - Math.abs(a.mean))[0];
    return {
      count: winters.length,
      phase: phase === 'el-nino' ? 'El Niño' : 'La Niña',
      region: best.name,
      direction: best.mean >= 0 ? 'wetter' : 'drier',
      sameSign: best.sameSign,
      total: best.total,
    };
  });

  /** Warmest month off Peru in the record. */
  protected readonly coastRecord = computed(() => {
    const months = this.data.nino12.value()?.months;
    if (!months) return null;
    const top = months.reduce((a, b) => (b.anomaly > a.anomaly ? b : a));
    return { month: formatMonth(top.month), value: formatAnomaly(top.anomaly) };
  });
}
