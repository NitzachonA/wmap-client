import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Home',
    loadComponent: () => import('./app').then(m => m.App)
  },
  {
    path: 'map',
    title: 'Map',
    loadComponent: () => import('./map/map-page.component').then(m => m.MapPageComponent)
  }
];
