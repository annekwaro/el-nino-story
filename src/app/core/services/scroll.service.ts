import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, NgZone, computed, inject, signal } from '@angular/core';

export type ScrollDirection = 'up' | 'down';

/**
 * Single, rAF-throttled window scroll listener shared by the whole app.
 * Runs outside the Angular zone; signal writes schedule change detection
 * only for the views that read them.
 */
@Injectable({ providedIn: 'root' })
export class ScrollService {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;

  private readonly _y = signal(0);
  private readonly _max = signal(1);
  private readonly _direction = signal<ScrollDirection>('down');

  readonly y = this._y.asReadonly();
  readonly direction = this._direction.asReadonly();
  /** 0 → 1 across the full document. */
  readonly progress = computed(() => Math.min(1, Math.max(0, this._y() / this._max())));

  constructor() {
    if (!this.window) return;
    const win = this.window;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const y = win.scrollY;
      const prev = this._y();
      if (y !== prev) this._direction.set(y > prev ? 'down' : 'up');
      this._y.set(y);
      this._max.set(Math.max(1, this.document.documentElement.scrollHeight - win.innerHeight));
    };
    const schedule = () => {
      if (!frame) frame = win.requestAnimationFrame(measure);
    };

    inject(NgZone).runOutsideAngular(() => {
      win.addEventListener('scroll', schedule, { passive: true });
      win.addEventListener('resize', schedule, { passive: true });
    });
    measure();

    inject(DestroyRef).onDestroy(() => {
      win.removeEventListener('scroll', schedule);
      win.removeEventListener('resize', schedule);
      if (frame) win.cancelAnimationFrame(frame);
    });
  }
}
