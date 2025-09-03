import { Component, ElementRef, OnDestroy, OnInit, ViewChild, PLATFORM_ID, Inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LocalizationService } from '../localization/localization.service';
import { MAP_CONFIG, type MapConfig } from '../map-config';
import { ArcGISInitService } from '../services/arcgis-init.service';
type MapView = __esri.MapView;
type Layer = __esri.Layer;
type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-leading' | 'top-trailing' | 'bottom-leading' | 'bottom-trailing';
import { SketchService } from '../services/sketch.service';
import { LayerService } from '../services/layer.service';
import { UIService } from '../services/ui.service';
import { MapStateService } from '../services/map-state.service';
import { SettingsService, type MapSettings, type UISettings } from '../services/settings.service';

@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-map-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'map-page.component.html',
  styleUrls: ['map-page.component.scss']
})
export class MapPageComponent implements OnInit, OnDestroy {
  @ViewChild('mapViewDiv', { static: true }) private mapViewDiv!: ElementRef<HTMLDivElement>;
  private view: MapView | null = null;
  private readonly isBrowser: boolean;
  private readonly destroy$ = new Subject<void>();

  // Expose sketch service state for template
  protected readonly canUndo$: Observable<boolean>;
  protected readonly canRedo$: Observable<boolean>;
  protected readonly hasFeatures$: Observable<boolean>;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    @Inject(MAP_CONFIG) private readonly config: MapConfig,
    protected readonly localizationService: LocalizationService,
    private readonly arcgisService: ArcGISInitService,
    protected readonly sketchService: SketchService,
    private readonly layerService: LayerService,
    private readonly uiService: UIService,
    private readonly mapStateService: MapStateService,
    private readonly settingsService: SettingsService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.canUndo$ = this.sketchService.canUndo$;
    this.canRedo$ = this.sketchService.canRedo$;
    this.hasFeatures$ = this.sketchService.hasFeatures$;
    
    if (this.isBrowser) {
      this.localizationService.current$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (this.view) {
            this.sketchService.initialize(this.view).catch(console.error);
          }
        });
    }
  }

  async ngOnInit() {
    if (!this.isBrowser) {
      return;
    }

    try {
      // Initialize the map and view using the service
      const view = await this.arcgisService.initializeMapView({
        container: this.mapViewDiv.nativeElement,
        layers: []  // We'll add layers through the LayerService
      });

      // Store view reference for use in other methods
      this.view = view;

      try {
        // Wait for view to be ready
        await view.when();

        // Initialize services in dependency order
        if (this.config.layers) {
          await this.layerService.initializeLayers(view, this.config.layers);
        }
        
        // Initialize sketch service first as UI depends on it
        await this.sketchService.initialize(view);
        
        // Initialize UI service after sketch service
        await this.uiService.initialize(view);
        
        // Initialize map state service last as it depends on view state
        await this.mapStateService.initialize(view);

        // Apply initial settings
        const currentSettings = this.settingsService.getCurrentSettings();
        await this.applyMapSettings(currentSettings.map);
        await this.applyUISettings(currentSettings.ui);
        
        // Subscribe to settings changes with error handling
        this.settingsService.mapSettings$
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: settings => this.applyMapSettings(settings),
            error: error => console.error('Error in map settings subscription:', error)
          });

        this.settingsService.uiSettings$
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: settings => this.applyUISettings(settings),
            error: error => console.error('Error in UI settings subscription:', error)
          });

      } catch (error) {
        console.error('Error initializing services:', error);
        // Clean up view if service initialization fails
        await this.arcgisService.detach();
        this.view = null;
        throw error;  // Re-throw to be caught by outer try-catch
      }
    } catch (error) {
      console.error('Error initializing map component:', error);
      // Ensure map div is cleaned up if initialization fails
      if (this.mapViewDiv?.nativeElement) {
        this.mapViewDiv.nativeElement.innerHTML = '';
      }
    }
  }

  // Sketch toolbar methods
  protected clear(): void {
    this.sketchService.clear();
  }

  protected undo(): void {
    this.sketchService.undo();
  }

  protected redo(): void {
    this.sketchService.redo();
  }

  /**
   * Apply map display settings
   */
  private async applyMapSettings(settings: MapSettings): Promise<void> {
    if (!this.view) return;

    try {
      const map = this.view.map;
      if (!map) return;

      // Update basemap
      if (settings.basemap) {
        const basemapName = settings.basemap.toLowerCase();
        
        try {
          // Import required basemap modules
          const [
            { default: VectorTileLayer },
            { default: TileLayer },
            { default: Basemap }
          ] = await Promise.all([
            import('@arcgis/core/layers/VectorTileLayer'),
            import('@arcgis/core/layers/TileLayer'),
            import('@arcgis/core/Basemap')
          ]);

          let basemap: __esri.Basemap;

          switch (basemapName) {
            case 'streets-vector':
              basemap = new Basemap({
                baseLayers: [
                  new VectorTileLayer({
                    url: "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer"
                  })
                ]
              });
              break;

            case 'satellite':
              basemap = new Basemap({
                baseLayers: [
                  new TileLayer({
                    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
                  })
                ]
              });
              break;

            case 'topo-vector':
              basemap = new Basemap({
                baseLayers: [
                  new VectorTileLayer({
                    url: "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer"
                  })
                ]
              });
              break;

            case 'dark-gray-vector':
              basemap = new Basemap({
                baseLayers: [
                  new VectorTileLayer({
                    url: "https://basemaps.arcgis.com/arcgis/rest/services/Dark_Gray_Canvas_Vector/VectorTileServer"
                  })
                ]
              });
              break;

            default:
              // Fallback to streets
              console.warn(`Unknown basemap: ${settings.basemap}, falling back to streets-vector`);
              basemap = new Basemap({
                baseLayers: [
                  new VectorTileLayer({
                    url: "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer"
                  })
                ]
              });
          }

          map.basemap = basemap;
        } catch (error) {
          console.error('Error setting basemap:', error);
        }
      }

      // Update map view properties
      if (map.ground) {
        map.ground.navigationConstraint = {
          type: settings.terrain3D ? "none" : "stay-above"
        };
      }

      // Update label visibility for all layers
      if (map.layers) {
        map.layers.forEach((layer: __esri.Layer) => {
          if ('labelsVisible' in layer) {
            (layer as any).labelsVisible = settings.showLabels; // Type safety handled by 'labelsVisible' in layer check
          }
        });
      }

    } catch (error) {
      console.error('Error applying map settings:', error);
    }
  }

  /**
   * Apply UI widget settings
   */
  private async applyUISettings(settings: UISettings): Promise<void> {
    if (!this.view) return;

    // We'll use the existing UI service methods
    await Promise.all([
      this.configureMinimapWidget(settings.minimap),
      this.configureCompassWidget(settings.compass),
      this.configureCoordinatesWidget(settings.mouseCoordinates),
      this.configureScalebarWidget(settings.scalebarUnit)
    ]);

    // Apply theme
    const calciteShell = document.querySelector('calcite-shell') as HTMLElement & {
      setAttribute(name: string, value: string): void;
      removeAttribute(name: string): void;
    };
    if (calciteShell) {
      if (settings.theme === 'auto') {
        calciteShell.removeAttribute('theme');
      } else {
        calciteShell.setAttribute('theme', settings.theme);
      }
    }
  }

  /**
   * Configure minimap widget
   */
  private async configureMinimapWidget(enabled: boolean): Promise<void> {
    if (!enabled || !this.view) return;
    const element = document.createElement('arcgis-mini-map') as HTMLElement;
    (element as any).view = this.view;
    await this.uiService.addWidget('minimap', element, { position: 'bottom-right' });
  }

  /**
   * Configure compass widget
   */
  private async configureCompassWidget(enabled: boolean): Promise<void> {
    if (!enabled || !this.view) return;
    const element = document.createElement('arcgis-compass') as HTMLElement;
    (element as any).view = this.view;
    await this.uiService.addWidget('compass', element, { position: 'top-right' });
  }

  /**
   * Configure coordinates widget
   */
  private async configureCoordinatesWidget(enabled: boolean): Promise<void> {
    if (!enabled || !this.view) return;
    const element = document.createElement('arcgis-coordinate-conversion') as HTMLElement;
    (element as any).view = this.view;
    await this.uiService.addWidget('coordinates', element, { position: 'bottom-left' });
  }

  /**
   * Configure scalebar widget
   */
  private async configureScalebarWidget(unit: 'metric' | 'imperial'): Promise<void> {
    if (!this.view) return;
    const element = document.createElement('arcgis-scalebar') as HTMLElement;
    (element as any).view = this.view;
    (element as any).unit = unit;
    await this.uiService.addWidget('scalebar', element, { position: 'bottom-left' });
  }

  private async initializeConfiguredWidgets(): Promise<void> {
    if (!this.view || !this.config.widgets) return;

    try {
      // Initialize configured widgets based on config
      if (this.config.widgets.search?.enabled) {
        const searchElement = document.createElement('arcgis-search') as ArcGISSearchElement;
        searchElement.view = this.view;
        this.view.ui.add(searchElement, this.config.widgets.search.position);
      }

      if (this.config.widgets.basemapToggle?.enabled) {
        const basemapToggleElement = document.createElement('arcgis-basemap-toggle') as ArcGISBasemapToggleElement;
        basemapToggleElement.view = this.view;
        basemapToggleElement.nextBasemap = this.config.widgets.basemapToggle.nextBasemap ?? 'satellite';
        this.view.ui.add(basemapToggleElement, this.config.widgets.basemapToggle.position);
      }

      if (this.config.widgets.layerList?.enabled) {
        const [{ default: LayerList }, { default: Expand }] = await Promise.all([
          import('@arcgis/core/widgets/LayerList'),
          import('@arcgis/core/widgets/Expand')
        ]);

        const layerList = new LayerList({ view: this.view });
        const expand = new Expand({
          view: this.view,
          content: layerList,
          expandIcon: 'layers',
          expanded: this.config.widgets.layerList.expanded
        });
        this.view.ui.add(expand, this.config.widgets.layerList.position);
      }
    } catch (error) {
      console.error('Error initializing widgets:', error);
    }
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;

    try {
      // First, signal all subscriptions to complete
      this.destroy$.next();
      this.destroy$.complete();

      // Clean up view and services in order
      if (this.view) {
        // Clean up services in dependency order
        this.uiService.destroy();       // UI components first (depends on sketch and layers)
        this.sketchService.destroy();   // Then sketch tools (depends on layers)
        this.layerService.destroy();    // Then layers (base level)
        this.mapStateService.destroy(); // Map state service (independent)
        
        // Detach from ArcGIS service last (this will handle final map cleanup)
        this.arcgisService.detach();
        this.view = null;
      }
      
      // Clean up the map container
      if (this.mapViewDiv?.nativeElement) {
        this.mapViewDiv.nativeElement.innerHTML = '';
      }
    } catch (error) {
      console.error('Error during component cleanup:', error);
      // Even if there's an error, try to complete the destroy$ subject
      if (!this.destroy$.closed) {
        this.destroy$.complete();
      }
    }
  }
}
