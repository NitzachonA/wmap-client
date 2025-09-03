import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideServerRendering } from '@angular/ssr';
import { provideRouter } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { routes } from './app.routes';
import { MAP_CONFIG, DEFAULT_MAP_CONFIG } from './map-config';

// Server-only application config. Avoid merging the browser `appConfig`
// which registers client-side providers (like hydration). Merging both
// caused duplicate provider registration and double-serialization.
export const config: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideClientHydration(),
    provideRouter(routes),
    // Add MAP_CONFIG for SSR
    {
      provide: MAP_CONFIG,
      useValue: {
        ...DEFAULT_MAP_CONFIG,
        // Override or add specific settings for your deployment
        apiKey: isDevMode() ? undefined : 'YOUR_PROD_API_KEY',
        viewConstraints: {
          ...DEFAULT_MAP_CONFIG.viewConstraints,
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
