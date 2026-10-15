import { DestroyRef, Directive, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { InViewService } from '../../core/services/in-view.service';

/**
 * Adds `is-revealed` to the host the first time it scrolls into view, then stops watching.
 * Styles own the animation; under prefers-reduced-motion they should show the end state.
 */
@Directive({
  selector: '[elReveal]',
  host: { '[class.is-revealed]': 'revealed()' },
  exportAs: 'elReveal',
})
export class RevealDirective {
  readonly revealed = signal(false);

  constructor() {
    const host: Element = inject(ElementRef).nativeElement;
    const inView = inject(InViewService);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const stop = inView.observe(
        host,
        (visible) => {
          if (!visible) return;
          this.revealed.set(true);
          stop();
        },
        { rootMargin: '0px 0px -12% 0px' },
      );
      destroyRef.onDestroy(stop);
    });
  }
}
