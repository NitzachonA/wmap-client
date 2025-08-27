import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ArcGISInitService {
  private readonly platformId = inject(PLATFORM_ID);

  async initialize() {
    if (isPlatformBrowser(this.platformId)) {
      const [{ default: esriConfig }, intl] = await Promise.all([
        import('@arcgis/core/config'),
        import('@arcgis/core/intl')
      ]);

      esriConfig.assetsPath = "/assets/arcgis";
      await intl.setLocale("he");
    }
  }
}
