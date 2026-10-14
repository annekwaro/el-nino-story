import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChapterPlaceholderComponent } from '../../shared/chapter-placeholder/chapter-placeholder.component';

@Component({
  selector: 'el-impacts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChapterPlaceholderComponent],
  template: `<el-chapter-placeholder number="05" title="Floods, droughts, fisheries" />`,
})
export class ImpactsComponent {}
