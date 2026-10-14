import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeroComponent } from './01-hero/hero.component';
import { ThePacificComponent } from './02-the-pacific/the-pacific.component';
import { TheShiftComponent } from './03-the-shift/the-shift.component';
import { TeleconnectionsComponent } from './04-teleconnections/teleconnections.component';
import { ImpactsComponent } from './05-impacts/impacts.component';
import { WhatComesNextComponent } from './06-what-comes-next/what-comes-next.component';

/** The story, top to bottom. Chapter order lives here. */
@Component({
  selector: 'el-story',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeroComponent,
    ThePacificComponent,
    TheShiftComponent,
    TeleconnectionsComponent,
    ImpactsComponent,
    WhatComesNextComponent,
  ],
  template: `
    <el-hero />
    <el-the-pacific />
    <el-the-shift />
    <el-teleconnections />
    <el-impacts />
    <el-what-comes-next />
  `,
})
export class StoryComponent {}
