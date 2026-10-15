import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { EnsoPhase } from '../../core/data/climate-data';
import { InViewService } from '../../core/services/in-view.service';
import { TIMELINE } from './enso-timeline';

const PHASE_COLOR: Record<EnsoPhase, string> = {
  'el-nino': 'var(--el-accent-warm)',
  'la-nina': 'var(--el-accent-cool)',
};

@Component({
  selector: 'el-years-that-changed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './years-that-changed.component.html',
  styleUrl: './years-that-changed.component.scss',
})
export class YearsThatChangedComponent {
  /**
   * Each row carries its own phase colour and the next event's: its spine runs in its
   * own colour down to its chip, then in the next event's colour toward the next chip.
   */
  protected readonly rows = TIMELINE.map((event, i) => ({
    event,
    color: PHASE_COLOR[event.phase],
    next: PHASE_COLOR[TIMELINE[Math.min(TIMELINE.length - 1, i + 1)].phase],
  }));

  /** Indices of events that have scrolled into view. Only ever grows. */
  protected readonly revealed = signal<ReadonlySet<number>>(new Set());

  private readonly items = viewChildren<ElementRef<HTMLElement>>('item');

  constructor() {
    const inView = inject(InViewService);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const stops = this.items().map((item, i) => {
        const stop = inView.observe(
          item.nativeElement,
          (visible) => {
            if (!visible) return;
            this.revealed.update((set) => new Set(set).add(i));
            stop();
          },
          { rootMargin: '0px 0px -15% 0px' },
        );
        return stop;
      });
      destroyRef.onDestroy(() => stops.forEach((stop) => stop()));
    });
  }
}
