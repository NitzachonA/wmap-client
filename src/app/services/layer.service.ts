import { Injectable, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ReplaySubject, BehaviorSubject, type Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type Layer from '@arcgis/core/layers/Layer';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import type MapView from '@arcgis/core/views/MapView';
import type Collection from '@arcgis/core/core/Collection';
import { ArcGISInitService } from './arcgis-init.service';

interface LayerInfo {
  id: string;
  title: string;
  visible?: boolean;
  type: 'feature' | 'graphics' | 'tile' | 'vector-tile';
  url?: string;
  opacity?: number;
  minScale?: number;
  maxScale?: number;
  definitionExpression?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LayerService {
  private readonly arcgisService: ArcGISInitService;
  private readonly isBrowser: boolean;
  
  // Layer tracking
  private readonly layersSubject = new BehaviorSubject<Map<string, Layer>>(new Map());
  private readonly operationalLayersSubject = new ReplaySubject<Layer[]>(1);
  private readonly layerViewsSubject = new BehaviorSubject<Map<string, __esri.LayerView>>(new Map());
  private view: MapView | null = null;
  private viewInitialized = false;
  private pendingLayerAdds = new Map<string, Layer>();

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    arcgisService: ArcGISInitService,
    private ngZone: NgZone
  ) {
    this.arcgisService = arcgisService;
    this.isBrowser = isPlatformBrowser(platformId);

    // Subscribe to view changes from arcgis service
    if (this.isBrowser) {
      this.arcgisService.view$.subscribe(async view => {
        // Run outside Angular zone
        this.ngZone.runOutsideAngular(async () => {
          const oldView = this.view;
          this.view = view;
          this.viewInitialized = false;
          
          // Clean up old view
          if (oldView) {
            // Clear layer views map
            const layerViews = this.layerViewsSubject.value;
            layerViews.clear();
            this.layerViewsSubject.next(layerViews);

            // Remove all layers from old view
            if (oldView.map?.layers) {
              oldView.map.layers.removeAll();
            }
          }

          // Setup watchers for new view
          if (view) {
            // Wait for view to be ready
            try {
              await view.when();
              
              // Initialize view
              this.setupLayerViewWatchers(view);
              this.viewInitialized = true;

              // Process any pending layer adds
              if (view.map) {
                this.pendingLayerAdds.forEach(layer => {
                  view.map!.add(layer);
                });
                this.pendingLayerAdds.clear();
              }
              
              // Re-add existing layers to new view
              const layers = this.layersSubject.value;
              if (view.map) {
                layers.forEach(layer => {
                  if (layer.id && !this.pendingLayerAdds.has(layer.id)) {
                    view.map!.add(layer);
                  }
                });
              }
            } catch (error) {
              console.error('Error initializing view:', error);
            }
        }
      });
    });
  }
}
  
  // Public observables
  readonly layers$ = this.layersSubject.asObservable();
  readonly operationalLayers$ = this.operationalLayersSubject.asObservable();
  readonly layerViews$ = this.layerViewsSubject.asObservable();

  /**
   * Get layer view status for a layer
   */
  getLayerView$(layerId: string): Observable<__esri.LayerView | undefined> {
    return this.layerViewsSubject.pipe(
      map(views => views.get(layerId))
    );
  }

  // Computed observables
  readonly visibleLayers$ = this.layers$.pipe(
    map(layers => Array.from(layers.values()).filter(layer => layer.visible))
  );

  /**
   * Setup layer view watchers for a MapView
   */
  private setupLayerViewWatchers(view: MapView): void {
    // Watch for layerview create/destroy events
    view.on('layerview-create', (event) => {
      const layerViews = this.layerViewsSubject.value;
      const layer = event.layer as Layer;
      if (layer.id) {
        layerViews.set(layer.id, event.layerView);
        // Update the subject inside Angular zone
        this.ngZone.run(() => {
          this.layerViewsSubject.next(layerViews);
        });
      }
    });

    view.on('layerview-destroy', (event) => {
      const layerViews = this.layerViewsSubject.value;
      const layer = event.layer as Layer;
      if (layer.id) {
        layerViews.delete(layer.id);
        // Update the subject inside Angular zone
        this.ngZone.run(() => {
          this.layerViewsSubject.next(layerViews);
        });
      }
    });
  }

  /**
   * Wait for a layer view to be created
   */
  private async waitForLayerView(layerId: string): Promise<__esri.LayerView> {
    try {
      // Check if layer view already exists
      const existingLayerView = this.layerViewsSubject.value.get(layerId);
      if (existingLayerView) {
        return existingLayerView;
      }

      // Ensure we have a valid view
      if (!this.view || !this.viewInitialized) {
        throw new Error('View not initialized');
      }

      // Get the layer
      const layer = this.layersSubject.value.get(layerId);
      if (!layer) {
        throw new Error(`Layer ${layerId} not found`);
      }

      // Make sure the layer is in the map
      if (!this.view.map?.layers.includes(layer)) {
        this.view.map?.add(layer);
      }

      // Use whenLayerView with a timeout
      const layerViewPromise = this.view.whenLayerView(layer);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Layer view creation timeout')), 10000);
      });

      // Race between layer view creation and timeout
      const layerView = await Promise.race([layerViewPromise, timeoutPromise]);
      
      // Add to tracking
      const layerViews = this.layerViewsSubject.value;
      layerViews.set(layerId, layerView as __esri.LayerView);
      this.layerViewsSubject.next(layerViews);

      return layerView as __esri.LayerView;
    } catch (error) {
      console.warn(`Error waiting for layer view ${layerId}:`, error);
      throw error;
    }
  }

  /**
   * Add a new layer to the map
   */
  async addLayer(info: LayerInfo): Promise<Layer | null> {
    if (!this.isBrowser) return null;

    try {
      const layer = await this.createLayer(info);
      if (!layer) return null;

      // Add to tracking
      const layers = this.layersSubject.value;
      layers.set(info.id, layer);
      this.layersSubject.next(layers);

      // Handle layer addition based on view state
      if (this.view?.ready && this.viewInitialized && this.view.map) {
        // View is ready, add layer directly
        this.view.map.add(layer);
      } else if (this.view) {
        // View exists but not ready, add to pending
        this.pendingLayerAdds.set(info.id, layer);
      }

      // Wait for layer view if view is ready
      if (this.view?.ready && this.viewInitialized) {
        try {
          await this.waitForLayerView(info.id);
        } catch (error) {
          console.warn(`Layer view creation failed for ${info.id}:`, error);
        }
      }

      // Update operational layers
      this.updateOperationalLayers();

      return layer;
    } catch (error) {
      console.error('Error adding layer:', error);
      return null;
    }
  }

  /**
   * Remove a layer from the map
   */
  removeLayer(id: string): void {
    const layers = this.layersSubject.value;
    const layer = layers.get(id);
    
    if (layer) {
      // Remove from map if it's currently added
      const view = this.arcgisService.getViewSync();
      if (view?.map) {
        view.map.remove(layer);
      }

      // Remove from tracking
      layers.delete(id);
      this.layersSubject.next(layers);

      // Update operational layers
      this.updateOperationalLayers();
    }
  }

  /**
   * Toggle layer visibility
   */
  toggleLayerVisibility(id: string, visible?: boolean): void {
    const layer = this.layersSubject.value.get(id);
    if (layer) {
      layer.visible = visible ?? !layer.visible;
      this.updateOperationalLayers();
    }
  }

  /**
   * Set layer opacity
   */
  setLayerOpacity(id: string, opacity: number): void {
    const layer = this.layersSubject.value.get(id);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
    }
  }

  /**
   * Update layer definition query (FeatureLayer only)
   */
  setDefinitionExpression(id: string, expression: string): void {
    const layer = this.layersSubject.value.get(id);
    if (layer && 'definitionExpression' in layer) {
      (layer as FeatureLayer).definitionExpression = expression;
    }
  }

  /**
   * Get layer by ID
   */
  getLayer(id: string): Layer | undefined {
    return this.layersSubject.value.get(id);
  }

  /**
   * Check if a layer exists
   */
  hasLayer(id: string): boolean {
    return this.layersSubject.value.has(id);
  }

  /**
   * Get layer info
   */
  getLayerInfo(id: string): LayerInfo | null {
    const layer = this.layersSubject.value.get(id);
    if (!layer) return null;

    return {
      id,
      title: layer.title || id,
      visible: layer.visible,
      type: this.getLayerType(layer),
      opacity: layer.opacity,
      url: 'url' in layer ? (layer as { url?: string }).url : undefined
    };
  }

  /**
   * Initialize layers for a view
   */
  async initializeLayers(view: MapView, layers: LayerInfo[]): Promise<void> {
    if (!this.isBrowser) return;

    try {
      const createdLayers = await Promise.all(
        layers.map(info => this.createLayer(info))
      );

      // Add successful layers to tracking
      const layerMap = new Map<string, Layer>();
      layers.forEach((info, index) => {
        const layer = createdLayers[index];
        if (layer) {
          layerMap.set(info.id, layer);
        }
      });

      // Update layer tracking
      this.layersSubject.next(layerMap);

      // Add layers to map
      if (view.map && layerMap.size > 0) {
        view.map.addMany(Array.from(layerMap.values()));
      }

      // Update operational layers
      this.updateOperationalLayers();
    } catch (error) {
      console.error('Error initializing layers:', error);
    }
  }

  /**
   * Create a layer instance based on layer info
   */
  private async createLayer(info: LayerInfo): Promise<Layer | null> {
    if (!this.isBrowser) return null;

    try {
      let layer: Layer | null = null;

      switch (info.type) {
        case 'feature': {
          const { default: FeatureLayer } = await import('@arcgis/core/layers/FeatureLayer');
          layer = new FeatureLayer({
            id: info.id,
            title: info.title,
            url: info.url,
            visible: info.visible,
            opacity: info.opacity,
            minScale: info.minScale,
            maxScale: info.maxScale,
            definitionExpression: info.definitionExpression
          });
          break;
        }
        case 'tile': {
          const { default: TileLayer } = await import('@arcgis/core/layers/TileLayer');
          layer = new TileLayer({
            id: info.id,
            title: info.title,
            url: info.url,
            visible: info.visible,
            opacity: info.opacity,
            minScale: info.minScale,
            maxScale: info.maxScale
          });
          break;
        }
        case 'vector-tile': {
          const { default: VectorTileLayer } = await import('@arcgis/core/layers/VectorTileLayer');
          layer = new VectorTileLayer({
            id: info.id,
            title: info.title,
            url: info.url,
            visible: info.visible,
            opacity: info.opacity,
            minScale: info.minScale,
            maxScale: info.maxScale
          });
          break;
        }
      }

      return layer;
    } catch (error) {
      console.error('Error creating layer:', error);
      return null;
    }
  }

  /**
   * Update the operational layers subject
   */
  private updateOperationalLayers(): void {
    const view = this.arcgisService.getViewSync();
    if (view?.map) {
      this.operationalLayersSubject.next(view.map.layers.toArray());
    }
  }

  /**
   * Get the type of a layer
   */
  private getLayerType(layer: Layer): LayerInfo['type'] {
    if ('geometryType' in layer) return 'feature';
    if ('tileInfo' in layer) return 'tile';
    if ('style' in layer) return 'vector-tile';
    return 'graphics';
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (!this.isBrowser) return;

    // Clear all layers
    const view = this.arcgisService.getViewSync();
    if (view?.map) {
      view.map.removeAll();
    }

    // Reset subjects
    this.layersSubject.next(new Map());
    this.operationalLayersSubject.next([]);
  }
}
