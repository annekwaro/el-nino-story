import { ChangeDetectionStrategy, Component, computed, effect, inject, resource, signal } from '@angular/core';
import { fetchJson, formatMonth, parseSstAnomaly, sstAnomalyUrl } from '../../core/data/climate-data';
import { ClimateDataService } from '../../core/data/climate-data.service';
import { ReducedMotionService } from '../../core/services/reduced-motion.service';
import { SstMapComponent } from '../../shared/sst-map/sst-map.component';

/** Cold to hot, ending on the strong El Niño the story is about. */
const FRAMES = ['2010-12', '2005-12', '1997-12'];
const FRAME_MS = 4500;

/** NOAA CPC's strength words for a peak 3-month Niño 3.4 anomaly. */
function strength(peak: number): string {
  return peak >= 2 ? 'very strong' : peak >= 1.5 ? 'strong' : peak >= 1 ? 'moderate' : 'weak';
}

@Component({
  selector: 'el-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SstMapComponent],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent {
  private readonly data = inject(ClimateDataService);
  protected readonly reduced = inject(ReducedMotionService).reduced;

  protected readonly frames = resource({
    loader: ({ abortSignal }) =>
      Promise.all(
        FRAMES.map(async (month) => {
          const url = sstAnomalyUrl(month);
          return parseSstAnomaly(await fetchJson(url, abortSignal), month, url);
        }),
      ),
  });

  /** Starts on the El Niño frame; autoplay then cycles from the coldest. */
  protected readonly active = signal(FRAMES.length - 1);
  protected readonly playing = signal(true);

  /** Each frame's phase, read from the episode data rather than assumed. */
  protected readonly labels = computed(() => {
    const episodes = this.data.episodes.value()?.episodes ?? [];
    return FRAMES.map((month) => {
      const episode = episodes.find((e) => e.start <= month && month <= e.end);
      const phase = episode
        ? `${strength(episode.peak)} ${episode.phase === 'el-nino' ? 'El Niño' : 'La Niña'}`
        : 'Neutral';
      return { month: formatMonth(month), phase, warm: episode?.phase === 'el-nino', cool: episode?.phase === 'la-nina' };
    });
  });

  constructor() {
    effect((onCleanup) => {
      if (!this.playing() || this.reduced() || !this.frames.value()) return;
      const id = setInterval(() => this.active.update((i) => (i + 1) % FRAMES.length), FRAME_MS);
      onCleanup(() => clearInterval(id));
    });
  }

  protected show(index: number): void {
    this.active.set(index);
    this.playing.set(false);
  }
}
