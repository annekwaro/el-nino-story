import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./chapters/story.component').then((m) => m.StoryComponent),
  },
  { path: '**', redirectTo: '' },
];
