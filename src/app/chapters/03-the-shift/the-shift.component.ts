import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChapterPlaceholderComponent } from '../../shared/chapter-placeholder/chapter-placeholder.component';

@Component({
  selector: 'el-the-shift',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChapterPlaceholderComponent],
  template: `<el-chapter-placeholder number="03" title="When the trade winds falter" />`,
})
export class TheShiftComponent {}
