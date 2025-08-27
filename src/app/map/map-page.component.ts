import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal, PLATFORM_ID, Inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LocalizationService } from '../localization/localization.service';

@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-map-page',
  standalone: true,
  imports: [CommonModule],
  // ...existing code...
  template: `
    <div #mapViewDiv class="map-container"></div>
    <div class="sketch-toolbar" [dir]="localizationService.localeDir$ | async">
      <calcite-button
        appearance="transparent"
        kind="neutral"
        icon-start="trash"
        (click)="clear()"
      >
        {{ localizationService.getLocalizedLabel('נקה', 'Clear') }}
      </calcite-button>
      <calcite-button
        appearance="transparent"
        kind="neutral"
        icon-start="arrow-left"
        [disabled]="!canUndo()"
        (click)="undo()"
      >
        {{ localizationService.getLocalizedLabel('בטל', 'Undo') }}
      </calcite-button>
      <calcite-button
        appearance="transparent"
        kind="neutral"
        icon-start="arrow-right"
        [disabled]="!canRedo()"
        (click)="redo()"
      >
        {{ localizationService.getLocalizedLabel('בצע שוב', 'Redo') }}
      </calcite-button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
    }
    .map-container {
      width: 100%;
      height: 100%;
    }
    .sketch-toolbar {
      position: absolute;
    /* place below the fixed top-bar (app uses 3.5rem margin for content)
      shift right and a bit lower so it doesn't cover nearby UI buttons */
    top: 16px;
    left: 80px;
  /* keep it below main chrome and calcite overlays (top-bar z-index: 1000) */
  z-index: 900;
      background: var(--calcite-ui-foreground-1);
      padding: 0.5rem;
      border-radius: 0.25rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      gap: 0.5rem;
    }
    calcite-button {
      --calcite-ui-text-1: var(--calcite-ui-text-1);
      --calcite-ui-text-3: var(--calcite-ui-text-3);
      min-width: 32px;
    }
  `]
})
export class MapPageComponent implements OnInit, OnDestroy {
  @ViewChild('mapViewDiv', { static: true }) private mapViewDiv!: ElementRef<HTMLDivElement>;
  private view: __esri.MapView | null = null;
  private graphicsLayer: __esri.GraphicsLayer | null = null;
  private sketch: __esri.Sketch | null = null;
  private sketchExpand: __esri.Expand | null = null;
  private operations = 0;
  private readonly isBrowser: boolean;
  // ...existing code...

  protected readonly localizationService = inject(LocalizationService);
  protected readonly canUndo = signal(false);
  protected readonly canRedo = signal(false);

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      this.localizationService.current$
        .pipe(takeUntilDestroyed())
        .subscribe(() => {
          if (this.view && this.sketch) {
            this.recreateSketchWidget().catch(console.error);
          }
        });
    }
  }

  async ngOnInit() {
    if (!this.isBrowser) {
      return;
    }

    try {
      const [
        { default: Map },
        { default: MapView },
        { default: BasemapToggle },
        { default: Search },
        { default: Expand },
        { default: LayerList },
        { default: FeatureLayer },
        { default: GraphicsLayer },
        { default: Sketch }
      ] = await Promise.all([
        import('@arcgis/core/Map'),
        import('@arcgis/core/views/MapView'),
        import('@arcgis/core/widgets/BasemapToggle'),
        import('@arcgis/core/widgets/Search'),
        import('@arcgis/core/widgets/Expand'),
        import('@arcgis/core/widgets/LayerList'),
        import('@arcgis/core/layers/FeatureLayer'),
        import('@arcgis/core/layers/GraphicsLayer'),
        import('@arcgis/core/widgets/Sketch')
      ]);

      // Create a sample feature layer (World Cities)
      const citiesLayer = new FeatureLayer({
        url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Cities/FeatureServer/0',
        popupTemplate: {
          title: '{CITY_NAME}',
          content: [
            {
              type: 'fields',
              fieldInfos: [
                { fieldName: 'COUNTRY', label: 'Country' },
                { fieldName: 'POP', label: 'Population' },
                { fieldName: 'STATUS', label: 'Status' }
              ]
            }
          ]
        }
      });

      // Create graphics layer for sketches
      this.graphicsLayer = new GraphicsLayer({
        title: 'Sketch Layer'
      });

      // Create map and view
      const map = new Map({
        basemap: 'topo-vector', // Using a supported basemap
        layers: [citiesLayer, this.graphicsLayer]
      });

      this.view = new MapView({
        container: this.mapViewDiv.nativeElement,
        map: map,
        center: [35.2137, 31.7683], // Jerusalem coordinates
        zoom: 10
      });

      await this.createSketchWidget();

      // Add search component
      const searchElement = document.createElement('arcgis-search') as ArcGISSearchElement;
      searchElement.view = this.view;
      this.view.ui.add(searchElement, 'top-right');

      // Add basemap toggle component
      const basemapToggleElement = document.createElement('arcgis-basemap-toggle') as ArcGISBasemapToggleElement;
      basemapToggleElement.view = this.view;
      basemapToggleElement.nextBasemap = 'satellite';
      this.view.ui.add(basemapToggleElement, 'bottom-right');

      // Add layer list in an expand widget
      const layerList = new LayerList({ view: this.view });
      const expand = new Expand({
        view: this.view,
        content: layerList,
        expandIcon: 'layers'
      });
      this.view.ui.add(expand, 'top-left');

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  // Sketch toolbar methods
  protected clear(): void {
    if (!this.graphicsLayer || !this.sketch) return;
    this.graphicsLayer.removeAll();
    this.canUndo.set(false);
    this.canRedo.set(false);
  }

  protected undo(): void {
    if (!this.sketch) return;
    this.sketch.undo();
  }

  protected redo(): void {
    if (!this.sketch) return;
    this.sketch.redo();
  }

  private async createSketchWidget(): Promise<void> {
    if (!this.view) return;

    const [{ default: Sketch }, { default: Expand }] = await Promise.all([
      import('@arcgis/core/widgets/Sketch'),
      import('@arcgis/core/widgets/Expand')
    ]);

    // Create and configure Sketch widget
    this.sketch = new Sketch({
      view: this.view,
      layer: this.graphicsLayer!,
      availableCreateTools: ['point', 'polyline', 'polygon', 'rectangle', 'circle'],
      defaultCreateOptions: {
        mode: 'click' // Use 'freehand' for freehand drawing mode
      },
      defaultUpdateOptions: {
        tool: 'transform',
        enableRotation: true,
        enableScaling: true
      },
      snappingOptions: {
        enabled: true
      }
    });

    // Wrap Sketch in Expand widget with localized tooltip
    this.sketchExpand = new Expand({
      view: this.view,
      content: this.sketch,
      expandIcon: 'edit',  // Using a standard icon instead of sketch
      expandTooltip: this.localizationService.getLocalizedLabel('שרטוט', 'Sketch')
    });

    // Add to UI
    this.view.ui.add(this.sketchExpand, 'top-right');

    // Set up event listeners
    this.setupSketchEventListeners();
  }

  private setupSketchEventListeners(): void {
    if (!this.sketch) return;

    this.sketch.on('create', (event) => {
      if (event.state === 'complete') {
        this.operations++;
        this.canUndo.set(this.operations > 0);
        this.canRedo.set(false);
        console.log('New geometry created:', event.graphic.geometry);
        // TODO: Persist the geometry to a service
        // await yourService.saveGeometry(event.graphic.geometry);
      }
    });

    this.sketch.on('update', (event) => {
      if (event.state === 'complete') {
        this.operations++;
        this.canUndo.set(this.operations > 0);
        this.canRedo.set(false);
      }
    });

    this.sketch.on('undo', () => {
      this.operations--;
      this.canUndo.set(this.operations > 0);
      this.canRedo.set(true);
    });

    this.sketch.on('redo', () => {
      this.operations++;
      this.canUndo.set(this.operations > 0);
      this.canRedo.set(this.operations < (this.sketch?.layer.graphics.length ?? 0));
    });
  }

  private async recreateSketchWidget(): Promise<void> {
    if (!this.isBrowser || !this.view) return;
    
    // Remove existing widget and its container
    if (this.sketchExpand) {
      this.view.ui.remove(this.sketchExpand);
      this.sketchExpand.destroy();
      this.sketchExpand = null;
    }
    if (this.sketch) {
      this.sketch.destroy();
      this.sketch = null;
    }

    // Create new widget
    await this.createSketchWidget();
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;

    if (this.view) {
      try {
        // Remove all UI components first
        this.view.ui.empty();
        
        // Clean up widgets
        if (this.sketchExpand) {
          this.sketchExpand.destroy();
          this.sketchExpand = null;
        }
        if (this.sketch) {
          this.sketch.destroy();
          this.sketch = null;
        }
        
        // Destroy the view and clean up its resources
        this.view.container = null;
        this.view.destroy();
        this.view = null;
        
        // Clean up the map div
        if (this.mapViewDiv?.nativeElement) {
          this.mapViewDiv.nativeElement.innerHTML = '';
        }

  // instance tracking removed; nothing to decrement
      } catch (error) {
        console.error('Error destroying map view:', error);
      }
    }
  }
}
