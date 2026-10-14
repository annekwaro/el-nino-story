import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChapterPlaceholderComponent } from '../../shared/chapter-placeholder/chapter-placeholder.component';

@Component({
  selector: 'el-what-comes-next',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChapterPlaceholderComponent],
  template: `<el-chapter-placeholder number="06" title="What comes next" />`,
})
export class WhatComesNextComponent {}
