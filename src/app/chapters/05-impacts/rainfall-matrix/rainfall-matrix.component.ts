import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { EnsoPhase, RainfallFile } from '../../../core/data/climate-data';
import { RevealDirective } from '../../../shared/reveal/reveal.directive';
import { IMPACTS } from '../../04-teleconnections/teleconnections';

/** Colour saturates at ±75 % of normal rainfall. */
const FULL_SCALE = 75;

interface Cell {
  winter: string;
  value: number;
  /** 0–100: how far toward the full wet or dry colour. */
  strength: number;
  wet: boolean;
  /** Matches the direction chapter 4's map expects. Null when it expects nothing. */
  agrees: boolean | null;
}

/**
 * Region × winter heatmap of Dec–Feb rainfall anomalies for one ENSO phase, with each region's
 * average and how often it went the way chapter 4's impact map predicts.
 */
@Component({
  selector: 'el-rainfall-matrix',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './rainfall-matrix.component.html',
  styleUrl: './rainfall-matrix.component.scss',
})
export class RainfallMatrixComponent {
  readonly data = input.required<RainfallFile>();
  readonly phase = input.required<EnsoPhase>();

  protected readonly hover = signal<{ row: number; col: number } | null>(null);

  protected readonly winters = computed(() => this.data().winters.filter((w) => w.phase === this.phase()));

  protected readonly rows = computed(() => {
    const expected = new Map(
      IMPACTS[this.phase()]
        .filter((i) => i.effect === 'wetter' || i.effect === 'drier')
        .map((i) => [i.region as string, i.effect]),
    );
    return this.data().regions.map((region) => {
      const expect = expected.get(region.id) ?? null;
      const cells: Cell[] = this.winters().map((w) => {
        const value = w.anomalies[region.id];
        return {
          winter: w.id,
          value,
          strength: Math.round(Math.min(1, Math.abs(value) / FULL_SCALE) * 100),
          wet: value >= 0,
          agrees: expect === null ? null : (value >= 0) === (expect === 'wetter'),
        };
      });
      const mean = cells.reduce((sum, c) => sum + c.value, 0) / Math.max(1, cells.length);
      return {
        id: region.id,
        name: region.name,
        expect,
        cells,
        mean,
        meanStrength: Math.round(Math.min(1, Math.abs(mean) / FULL_SCALE) * 100),
        hits: cells.filter((c) => c.agrees).length,
      };
    });
  });

  protected readonly readout = computed(() => {
    const h = this.hover();
    if (!h) return null;
    const row = this.rows()[h.row];
    const cell = row?.cells[h.col];
    return cell ? `${row.name}, winter ${cell.winter}: ${format(cell.value)} rainfall` : null;
  });

  protected readonly format = format;
}

function format(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return `${sign}${Math.abs(rounded)}%`;
}
