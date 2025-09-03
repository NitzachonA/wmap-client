import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, provideProtractorTestingSupport } from '@angular/platform-browser';
import { MAP_CONFIG, DEFAULT_MAP_CONFIG } from './map-config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(),
    isDevMode() ? provideProtractorTestingSupport() : [],
    {
      provide: 'SSR',
      useValue: true
    },
    {
      provide: MAP_CONFIG,
      useValue: {
        ...DEFAULT_MAP_CONFIG,
        // Override or add specific settings for your deployment
        apiKey: isDevMode() ? undefined : 'YOUR_PROD_API_KEY', // Optional
        viewConstraints: {
          ...DEFAULT_MAP_CONFIG.viewConstraints,
          // Example: tighter zoom constraints for production
          minZoom: 5,
          maxZoom: 16
        },
        sketchLayer: {
          ...DEFAULT_MAP_CONFIG.sketchLayer,
          title: 'User Sketches'
        },
        widgets: {
          ...DEFAULT_MAP_CONFIG.widgets,
          search: {
            position: 'top-right',
            enabled: true
          },
          basemapToggle: {
            position: 'bottom-right',
            enabled: true,
            nextBasemap: 'satellite'
          },
          layerList: {
            position: 'top-left',
            enabled: true,
            expanded: false
          }
        }
      }
    }
  ]
};
