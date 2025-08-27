import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { ArcGISInitService } from './app/services/arcgis-init.service';

bootstrapApplication(App, appConfig)
  .then(appRef => {
    // Initialize ArcGIS after the app is bootstrapped
    const arcGISInit = appRef.injector.get(ArcGISInitService);
    return arcGISInit.initialize();
  })
  .catch(err => console.error(err));
