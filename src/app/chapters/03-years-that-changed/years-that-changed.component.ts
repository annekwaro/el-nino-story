import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { EnsoPhase } from '../../core/data/climate-data';
import { InViewService } from '../../core/services/in-view.service';
import { ScrollService } from '../../core/services/scroll.service';
import { TIMELINE } from './enso-timeline';

/** The spine is drawn down to this fraction of the viewport height. */
const DRAW_LINE = 0.65;

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
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  /**
   * Each row's top and height relative to the list, re-measured whenever the list resizes.
   * Relative, because content above (chapter 2's chart, once its data loads) moves the whole list.
   */
  private readonly rects = signal<{ top: number; height: number }[]>([]);

  /** Deepest point the spine has been drawn to, in list px. Only ever grows, so it never retracts. */
  private readonly head = signal(0);

  /** How much of each row's spine segment is drawn, 0–1. */
  private readonly draw = computed(() =>
    this.rects().map(({ top, height }) => Math.max(0, Math.min(1, (this.head() - top) / height))),
  );

  /** 0 until the rows have been measured. */
  protected drawOf(index: number): number {
    return this.draw()[index] ?? 0;
  }

  constructor() {
    const inView = inject(InViewService);
    const scroll = inject(ScrollService);
    const destroyRef = inject(DestroyRef);

    effect(() => {
      scroll.y(); // re-run on every scroll frame
      const listTop = this.list().nativeElement.getBoundingClientRect().top;
      const line = window.innerHeight * DRAW_LINE - listTop;
      if (line > this.head()) this.head.set(line);
    });

    afterNextRender(() => {
      const measure = () => {
        const listTop = this.list().nativeElement.getBoundingClientRect().top;
        this.rects.set(
          this.items().map(({ nativeElement: el }) => {
            const box = el.getBoundingClientRect();
            return { top: box.top - listTop, height: box.height };
          }),
        );
      };
      measure();
      const resize = new ResizeObserver(measure);
      resize.observe(this.list().nativeElement);

      const stops = this.items().map((item, i) => {
        const stop = inView.observe(
          item.nativeElement,
          (visible) => {
            if (!visible) return;
            this.revealed.update((set) => new Set(set).add(i));
            stop();
          },
          { threshold: 0.3 },
        );
        return stop;
      });
      destroyRef.onDestroy(() => {
        resize.disconnect();
        stops.forEach((stop) => stop());
      });
    });
  }
}
