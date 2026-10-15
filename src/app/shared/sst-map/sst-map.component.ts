import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { interpolateRgb, rgb, scaleLinear } from 'd3';
import { SstAnomalyFile } from '../../core/data/climate-data';

export type SstMapStatus = 'loading' | 'ready' | 'error';

/** Grid bounds in degrees, measured to cell edges rather than centres. */
interface Extent {
  west: number;
  east: number;
  south: number;
  north: number;
}

/** Niño 3.4 region: 5°N–5°S, 170°W–120°W. */
const NINO34_BOX = { west: 190, east: 240, south: -5, north: 5 };

/**
 * Equirectangular SST anomaly map: one canvas pixel per grid cell, scaled up by CSS
 * (smoothed), with an SVG overlay for reference lines. Shared by every chapter that shows SST.
 */
@Component({
  selector: 'el-sst-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sst-map.component.html',
  styleUrl: './sst-map.component.scss',
})
export class SstMapComponent {
  readonly data = input<SstAnomalyFile | undefined>();
  readonly status = input<SstMapStatus>('ready');
  /** Colour range is fixed at ±limit °C so months compare honestly. */
  readonly limit = input(3);
  readonly showNino34Box = input(false);
  readonly caption = input('');

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  /** Last grid actually painted. Kept while the next month loads so the frame never blanks. */
  protected readonly drawn = signal<SstAnomalyFile | null>(null);
  protected readonly showPlaceholder = computed(() => !this.drawn() || this.status() === 'error');

  protected readonly extent = computed(() => {
    const grid = this.drawn();
    return grid ? gridExtent(grid) : null;
  });

  protected readonly aspectRatio = computed(() => {
    const e = this.extent();
    return e ? `${e.east - e.west} / ${e.north - e.south}` : '17 / 6';
  });

  protected readonly viewBox = computed(() => {
    const e = this.extent();
    return e ? `${e.west} ${-e.north} ${e.east - e.west} ${e.north - e.south}` : '0 0 1 1';
  });

  protected readonly equator = computed(() => {
    const e = this.extent();
    return e && e.south < 0 && e.north > 0 ? e : null;
  });

  protected readonly nino34Box = computed(() => {
    const e = this.extent();
    const b = NINO34_BOX;
    const fits = e && b.west >= e.west && b.east <= e.east && b.south >= e.south && b.north <= e.north;
    return this.showNino34Box() && fits ? b : null;
  });

  /** Every 30° of longitude, placed as a % of the frame width. */
  protected readonly lonTicks = computed(() => {
    const e = this.extent();
    if (!e) return [];
    const ticks = [];
    for (let lon = Math.ceil(e.west / 30) * 30; lon <= e.east; lon += 30) {
      ticks.push({ lon, left: ((lon - e.west) / (e.east - e.west)) * 100, label: formatLon(lon) });
    }
    return ticks;
  });

  constructor() {
    effect(() => {
      const grid = this.data();
      if (!grid) return;
      paint(this.canvas().nativeElement, grid, this.palette(this.limit()));
      this.drawn.set(grid);
    });
  }

  /** Diverging cool → background → warm, read from the design tokens at paint time. */
  private palette(limit: number) {
    const style = getComputedStyle(this.host);
    const token = (name: string) => style.getPropertyValue(name).trim();
    const scale = scaleLinear<string>()
      .domain([-limit, 0, limit])
      .range([token('--el-accent-cool'), token('--el-bg'), token('--el-accent-warm')])
      .interpolate(interpolateRgb)
      .clamp(true);
    return { scale, land: rgb(token('--el-accent-neutral')) };
  }
}

function gridExtent({ lats, lons }: SstAnomalyFile): Extent {
  const dLat = Math.abs(lats[1] - lats[0]);
  const dLon = lons[1] - lons[0];
  return {
    west: lons[0] - dLon / 2,
    east: lons[lons.length - 1] + dLon / 2,
    south: Math.min(lats[0], lats[lats.length - 1]) - dLat / 2,
    north: Math.max(lats[0], lats[lats.length - 1]) + dLat / 2,
  };
}

function paint(
  canvas: HTMLCanvasElement,
  grid: SstAnomalyFile,
  palette: { scale: (v: number) => string; land: ReturnType<typeof rgb> },
): void {
  const rows = grid.lats.length;
  const cols = grid.lons.length;
  const northFirst = grid.lats[0] > grid.lats[rows - 1];
  canvas.width = cols;
  canvas.height = rows;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const image = ctx.createImageData(cols, rows);

  for (let i = 0; i < rows; i++) {
    const y = northFirst ? i : rows - 1 - i;
    for (let j = 0; j < cols; j++) {
      const value = grid.values[i][j];
      const c = value === null ? palette.land : rgb(palette.scale(value));
      const o = (y * cols + j) * 4;
      image.data[o] = c.r;
      image.data[o + 1] = c.g;
      image.data[o + 2] = c.b;
      image.data[o + 3] = value === null ? 140 : 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** 0–360 °E → '150°E', '180°', '120°W'. */
function formatLon(lon: number): string {
  const l = ((lon % 360) + 360) % 360;
  if (l === 0 || l === 180) return `${l}°`;
  return l < 180 ? `${l}°E` : `${360 - l}°W`;
}
