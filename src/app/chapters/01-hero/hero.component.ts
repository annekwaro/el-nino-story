import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'el-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent {}
