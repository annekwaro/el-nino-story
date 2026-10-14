import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScrollProgressComponent } from './core/layout/scroll-progress/scroll-progress.component';
import { SiteFooterComponent } from './core/layout/site-footer/site-footer.component';
import { SiteNavComponent } from './core/layout/site-nav/site-nav.component';

@Component({
  selector: 'el-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteNavComponent, ScrollProgressComponent, SiteFooterComponent],
  template: `
    <el-scroll-progress />
    <el-site-nav />
    <main>
      <router-outlet />
    </main>
    <el-site-footer />
  `,
})
export class AppComponent {}
