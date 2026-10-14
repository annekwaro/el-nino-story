import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Credit {
  name: string;
  org: string;
  url: string;
}

@Component({
  selector: 'el-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer">
      <p class="el-kicker">Data sources</p>
      <ul class="credits">
        @for (credit of credits; track credit.url) {
          <li>
            <a [href]="credit.url" rel="noopener" target="_blank">{{ credit.name }}</a>
            <span class="credits__org">{{ credit.org }}</span>
          </li>
        }
      </ul>
      <p class="footer__note">
        Typeset in General Sans, Inter and JetBrains Mono — all served from this site.
      </p>
    </footer>
  `,
  styles: `
    .footer {
      max-width: calc(var(--el-measure) + 2 * var(--el-gutter));
      margin: 0 auto;
      padding: var(--el-space-7) var(--el-gutter) var(--el-space-6);
      border-top: 1px solid var(--el-rule);
      font-size: var(--el-text-sm);
    }
    .credits {
      list-style: none;
      margin: var(--el-space-3) 0 var(--el-space-5);
      padding: 0;
      display: grid;
      gap: var(--el-space-2);
    }
    .credits__org,
    .footer__note {
      color: var(--el-ink-muted);
    }
    .credits__org::before {
      content: ' — ';
    }
  `,
})
export class SiteFooterComponent {
  // Placeholder list — confirm against the datasets actually used before publishing.
  readonly credits: Credit[] = [
    {
      name: 'Oceanic Niño Index (ONI)',
      org: 'NOAA Climate Prediction Center',
      url: 'https://origin.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php',
    },
    {
      name: 'Extended Reconstructed SST v5',
      org: 'NOAA NCEI',
      url: 'https://www.ncei.noaa.gov/products/extended-reconstructed-sst',
    },
  ];
}
