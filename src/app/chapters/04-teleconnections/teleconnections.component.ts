import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChapterPlaceholderComponent } from '../../shared/chapter-placeholder/chapter-placeholder.component';

@Component({
  selector: 'el-teleconnections',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChapterPlaceholderComponent],
  template: `<el-chapter-placeholder number="04" title="Ripples across the globe" />`,
})
export class TeleconnectionsComponent {}
