import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/**
 * Mirrors `prefers-reduced-motion: reduce` as a signal so JS-driven motion
 * (scrollama steps, D3 transitions) can opt out the same way CSS does.
 */
@Injectable({ providedIn: 'root' })
export class ReducedMotionService {
  private readonly _reduced = signal(false);
  readonly reduced = this._reduced.asReadonly();

  constructor() {
    const mql = inject(DOCUMENT).defaultView?.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mql) return;

    this._reduced.set(mql.matches);
    const onChange = (e: MediaQueryListEvent) => this._reduced.set(e.matches);
    mql.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => mql.removeEventListener('change', onChange));
  }
}
