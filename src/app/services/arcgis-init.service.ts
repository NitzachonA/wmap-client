import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ReplaySubject } from 'rxjs';
import type Map from '@arcgis/core/Map';
import type MapView from '@arcgis/core/views/MapView';
import esriConfig from '@arcgis/core/config';

@Injectable({
  providedIn: 'root'
})
export class ArcGISInitService {
  private readonly platformId: Object;
  private readonly mapSubject = new ReplaySubject<Map>(1);
  private readonly viewSubject = new ReplaySubject<MapView>(1);

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.platformId = platformId;
  }
  
  // Current instances
  private map: Map | null = null;
  private view: MapView | null = null;

  /**
   * Initialize a new MapView instance with the given configuration
   * @param options View initialization options
   * @returns A promise that resolves to the initialized MapView
   */
  async initializeMapView(options: {
    container: HTMLDivElement;
    layers?: __esri.Layer[];
  }): Promise<MapView> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Cannot initialize MapView in non-browser environment');
    }

    const [{ default: Map }, { default: MapView }] = await Promise.all([
      import('@arcgis/core/Map'),
      import('@arcgis/core/views/MapView')
    ]);

    // Create map with configured layers
    const map = new Map({
      basemap: 'topo-vector',
      layers: options.layers
    });

    // Create view
    const view = new MapView({
      container: options.container,
      map,
      zoom: 10,
      center: [35.2137, 31.7683] // Default to Jerusalem
    });

    // Store and emit instances
    this.attach(map, view);

    return view;
  }

  // Observable streams
  readonly map$ = this.mapSubject.asObservable();
  readonly view$ = this.viewSubject.asObservable();

  // Sync accessors (careful: may return null if not initialized)
  getMapSync(): Map | null {
    return this.map;
  }

  getViewSync(): MapView | null {
    return this.view;
  }

  /**
   * Initializes ArcGIS API configuration
   */
  async initialize() {
    if (isPlatformBrowser(this.platformId)) {
      const intl = await import('@arcgis/core/intl');
      
      esriConfig.assetsPath = "/assets/arcgis";
      await intl.setLocale("he");
    }
  }

  /**
   * Attaches Map and MapView instances to this service
   * @param map The Map instance to attach
   * @param view The MapView instance to attach
   */
  attach(map: Map, view: MapView): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Store instances
    this.map = map;
    this.view = view;

    // Emit to subscribers
    this.mapSubject.next(map);
    this.viewSubject.next(view);
  }

  /**
   * Detaches current Map and MapView instances
   */
  detach(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.map = null;
    this.view = null;
  }

  /**
   * Configures global ArcGIS API settings
   * @param apiKey Optional API key for authenticated requests
   * @param portalUrl Optional custom portal URL
   */
  configure(apiKey?: string, portalUrl?: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (apiKey) {
      esriConfig.apiKey = apiKey;
    }
    if (portalUrl) {
      esriConfig.portalUrl = portalUrl;
    }
  }
}
