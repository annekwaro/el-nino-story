import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ScrollService } from '../../services/scroll.service';

/** Visible at the top of the page; slides away once reading starts, returns on scroll-up. */
const HIDE_AFTER_PX = 120;

@Component({
  selector: 'el-site-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-hidden]': 'hidden()' },
  template: `
    <nav class="nav" aria-label="Site">
      <a class="nav__title" href="#top">El Niño</a>
      <span class="nav__meta el-kicker">A data story</span>
    </nav>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0 0 auto;
      z-index: 50;
      transition:
        transform var(--el-duration-base) var(--el-ease-out),
        opacity var(--el-duration-base) var(--el-ease-out);
    }
    :host(.is-hidden) {
      transform: translateY(-100%);
      opacity: 0;
    }
    /* Keyboard users must always be able to reach it. */
    :host(.is-hidden:focus-within) {
      transform: none;
      opacity: 1;
    }
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--el-nav-height);
      padding: 0 var(--el-gutter);
      background: color-mix(in srgb, var(--el-bg) 85%, transparent);
      backdrop-filter: blur(8px);
    }
    .nav__title {
      font-family: var(--el-font-display);
      font-weight: 600;
      text-decoration: none;
      letter-spacing: -0.01em;
    }
  `,
})
export class SiteNavComponent {
  private readonly scroll = inject(ScrollService);

  readonly hidden = computed(
    () => this.scroll.y() > HIDE_AFTER_PX && this.scroll.direction() === 'down',
  );
}
