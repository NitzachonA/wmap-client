import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Home',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'map',
    title: 'Map',
    loadComponent: () => import('./map/map-page.component').then(m => m.MapPageComponent)
  }
];
