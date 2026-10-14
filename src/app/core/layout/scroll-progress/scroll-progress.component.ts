import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ScrollService } from '../../services/scroll.service';

@Component({
  selector: 'el-scroll-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `<div class="bar" [style.transform]="transform()"></div>`,
  styles: `
    :host {
      position: fixed;
      inset: 0 0 auto;
      z-index: 60;
      height: 3px;
      pointer-events: none;
    }
    .bar {
      height: 100%;
      background: linear-gradient(90deg, var(--el-water), var(--el-accent-warm));
      transform-origin: 0 50%;
      will-change: transform;
    }
  `,
})
export class ScrollProgressComponent {
  private readonly scroll = inject(ScrollService);
  readonly transform = computed(() => `scaleX(${this.scroll.progress()})`);
}
