import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';

export interface InViewOptions {
  /** Same syntax as IntersectionObserver's rootMargin. Default '0px'. */
  rootMargin?: string;
  /** Default 0. */
  threshold?: number;
}

export type InViewCallback = (visible: boolean, entry?: IntersectionObserverEntry) => void;

/**
 * The app's one place for IntersectionObserver.
 * Elements watched with the same options share a single observer.
 */
@Injectable({ providedIn: 'root' })
export class InViewService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly observers = new Map<string, IntersectionObserver>();
  private readonly callbacks = new Map<Element, InViewCallback>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.observers.forEach((o) => o.disconnect()));
  }

  /**
   * Calls `callback` whenever `element` enters or leaves the viewport.
   * Returns a function that stops watching it.
   * Without IntersectionObserver support, reports the element as visible once.
   */
  observe(element: Element, callback: InViewCallback, options: InViewOptions = {}): () => void {
    if (!this.window || !('IntersectionObserver' in this.window)) {
      queueMicrotask(() => callback(true));
      return () => {};
    }

    const observer = this.observerFor(options);
    this.callbacks.set(element, callback);
    observer.observe(element);

    return () => {
      observer.unobserve(element);
      this.callbacks.delete(element);
    };
  }

  private observerFor({ rootMargin = '0px', threshold = 0 }: InViewOptions): IntersectionObserver {
    const key = `${rootMargin}|${threshold}`;
    let observer = this.observers.get(key);
    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) this.callbacks.get(entry.target)?.(entry.isIntersecting, entry);
        },
        { rootMargin, threshold },
      );
      this.observers.set(key, observer);
    }
    return observer;
  }
}
