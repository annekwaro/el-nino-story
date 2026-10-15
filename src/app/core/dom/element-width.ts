import { DestroyRef, ElementRef, Signal, afterNextRender, inject, signal } from '@angular/core';

/**
 * The host element's content width in px, kept current with a ResizeObserver.
 * 0 until the first render. Call from a component's injection context.
 */
export function injectElementWidth(): Signal<number> {
  const host: HTMLElement = inject(ElementRef).nativeElement;
  const destroyRef = inject(DestroyRef);
  const width = signal(0);

  afterNextRender(() => {
    width.set(host.clientWidth);
    const observer = new ResizeObserver(([entry]) => width.set(Math.floor(entry.contentRect.width)));
    observer.observe(host);
    destroyRef.onDestroy(() => observer.disconnect());
  });

  return width.asReadonly();
}
