import { ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/ssr';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

// Server-only application config. Avoid merging the browser `appConfig`
// which registers client-side providers (like hydration). Merging both
// caused duplicate provider registration and double-serialization.
export const config: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideRouter(routes)
  ]
};
