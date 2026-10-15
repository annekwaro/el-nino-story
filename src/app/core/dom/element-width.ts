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

/** Like injectElementWidth, but tracks the host's content height too. */
export function injectElementSize(): Signal<{ width: number; height: number }> {
  const host: HTMLElement = inject(ElementRef).nativeElement;
  const destroyRef = inject(DestroyRef);
  const size = signal({ width: 0, height: 0 });

  afterNextRender(() => {
    size.set({ width: host.clientWidth, height: host.clientHeight });
    const observer = new ResizeObserver(([entry]) =>
      size.set({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) }),
    );
    observer.observe(host);
    destroyRef.onDestroy(() => observer.disconnect());
  });

  return size.asReadonly();
}
