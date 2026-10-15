import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeroComponent } from './01-hero/hero.component';
import { Nino34ExplorerComponent } from './02-nino34-explorer/nino34-explorer.component';
import { YearsThatChangedComponent } from './03-years-that-changed/years-that-changed.component';
import { TeleconnectionsComponent } from './04-teleconnections/teleconnections.component';
import { ImpactsComponent } from './05-impacts/impacts.component';
import { WhatComesNextComponent } from './06-what-comes-next/what-comes-next.component';

/** The story, top to bottom. Chapter order lives here. */
@Component({
  selector: 'el-story',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeroComponent,
    Nino34ExplorerComponent,
    YearsThatChangedComponent,
    TeleconnectionsComponent,
    ImpactsComponent,
    WhatComesNextComponent,
  ],
  template: `
    <el-hero />
    <el-nino34-explorer />
    <el-years-that-changed />
    <el-teleconnections />
    <el-impacts />
    <el-what-comes-next />
  `,
})
export class StoryComponent {}
