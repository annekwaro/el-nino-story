import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Stand-in section so chapters 02–06 have scroll length until they're built. */
@Component({
  selector: 'el-chapter-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="placeholder" [id]="'chapter-' + number()">
      <p class="el-kicker"><span class="el-num">{{ number() }}</span> / Coming soon</p>
      <h2 class="placeholder__title">{{ title() }}</h2>
    </section>
  `,
  styles: `
    .placeholder {
      display: grid;
      align-content: center;
      gap: var(--el-space-3);
      min-height: 80vh;
      max-width: calc(var(--el-measure) + 2 * var(--el-gutter));
      margin: 0 auto;
      padding: var(--el-space-7) var(--el-gutter);
      border-top: 1px dashed var(--el-rule);
    }
    .placeholder__title {
      font-size: var(--el-text-xl);
      color: var(--el-ink-muted);
    }
  `,
})
export class ChapterPlaceholderComponent {
  readonly number = input.required<string>();
  readonly title = input.required<string>();
}
