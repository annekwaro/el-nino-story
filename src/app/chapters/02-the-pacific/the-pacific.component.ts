import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChapterPlaceholderComponent } from '../../shared/chapter-placeholder/chapter-placeholder.component';

@Component({
  selector: 'el-the-pacific',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChapterPlaceholderComponent],
  template: `<el-chapter-placeholder number="02" title="A normal year in the Pacific" />`,
})
export class ThePacificComponent {}
