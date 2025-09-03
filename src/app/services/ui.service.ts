import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, type Observable } from 'rxjs';
import type MapView from '@arcgis/core/views/MapView';
import type Widget from '@arcgis/core/widgets/Widget';
import type Expand from '@arcgis/core/widgets/Expand';
import { MAP_CONFIG, type MapConfig } from '../map-config';
import { LocalizationService } from '../localization/localization.service';

type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-leading' | 'top-trailing' | 'bottom-leading' | 'bottom-trailing';

export interface WidgetUpdateOptions {
  minimap?: boolean;
  compass?: boolean;
  coordinates?: boolean;
  scalebar?: {
    unit: 'metric' | 'imperial';
  };
}

export interface WidgetInstance {
  id: string;
  widget: Widget | HTMLElement;
  container?: Expand;
  position: Position;
  visible: boolean;
  index?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UIService {
  private readonly config: MapConfig;
  private readonly isBrowser: boolean;
  private view: MapView | null = null;
  
  // Track widgets by ID
  private readonly widgetsSubject = new BehaviorSubject<Map<string, WidgetInstance>>(new Map());
  readonly widgets$ = this.widgetsSubject.asObservable();

  // Widget IDs for built-in widgets
  private readonly MINIMAP_ID = 'minimap';
  private readonly COMPASS_ID = 'compass';
  private readonly COORDS_ID = 'coordinates';
  private readonly SCALEBAR_ID = 'scalebar';

  constructor(
    @Inject(MAP_CONFIG) config: MapConfig,
    @Inject(PLATFORM_ID) platformId: Object,
    private readonly localizationService: LocalizationService
  ) {
    this.config = config;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Initialize the UI service with a MapView
   */
  async initialize(view: MapView): Promise<void> {
    if (!this.isBrowser) return;
    this.view = view;

    // Initialize configured widgets
    if (this.config.widgets) {
      await this.initializeConfiguredWidgets();
    }
  }

  /**
   * Add a widget to the map
   */
  async addWidget(
    id: string,
    widget: Widget | HTMLElement,
    options: {
      position: Position;
      index?: number;
      expanded?: boolean;
      expandTooltip?: string;
      expandIconClass?: string;
      group?: string;
    }
  ): Promise<void> {
    if (!this.isBrowser || !this.view) return;

    try {
      let finalWidget: Widget | HTMLElement = widget;
      let container: Expand | undefined;

      // If it's not an HTML element and needs an expand container
      if (!('tagName' in widget) && options.expandTooltip) {
        const { default: ExpandWidget } = await import('@arcgis/core/widgets/Expand');
        container = new ExpandWidget({
          view: this.view,
          content: widget,
          expanded: options.expanded,
          expandIcon: options.expandIconClass,
          expandTooltip: options.expandTooltip,
          group: options.group
        });
        finalWidget = container;
      }

      // Add to view
      this.view.ui.add(finalWidget, {
        position: options.position,
        index: options.index
      });

      // Track widget
      const widgets = this.widgetsSubject.value;
      widgets.set(id, {
        id,
        widget,
        container,
        position: options.position,
        visible: true,
        index: options.index
      });
      this.widgetsSubject.next(widgets);

    } catch (error) {
      console.error('Error adding widget:', error);
    }
  }

  /**
   * Remove a widget from the map
   */
  removeWidget(id: string): void {
    if (!this.isBrowser || !this.view) return;

    const widgets = this.widgetsSubject.value;
    const instance = widgets.get(id);
    
    if (instance) {
      // Remove from view
      this.view.ui.remove(instance.container || instance.widget);
      
      // Clean up if it's an Expand container
      if (instance.container && 'destroy' in instance.container) {
        instance.container.destroy();
      }
      // Clean up if original widget needs destruction
      if ('destroy' in instance.widget) {
        instance.widget.destroy();
      }

      // Remove from tracking
      widgets.delete(id);
      this.widgetsSubject.next(widgets);
    }
  }

  /**
   * Toggle widget visibility
   */
  toggleWidget(id: string, visible?: boolean): void {
    if (!this.isBrowser || !this.view) return;

    const widgets = this.widgetsSubject.value;
    const instance = widgets.get(id);
    
    if (instance) {
      const newVisible = visible ?? !instance.visible;
      if (newVisible !== instance.visible) {
        if (newVisible) {
          this.view.ui.add(instance.container || instance.widget, {
            position: instance.position,
            index: instance.index
          });
        } else {
          this.view.ui.remove(instance.container || instance.widget);
        }
        instance.visible = newVisible;
        widgets.set(id, instance);
        this.widgetsSubject.next(widgets);
      }
    }
  }

  /**
   * Update widget settings
   */
  async updateWidgets(options: WidgetUpdateOptions): Promise<void> {
    if (!this.view || !this.isBrowser) return;

    const widgets = this.widgetsSubject.value;

    // Update minimap
    if (options.minimap !== undefined) {
      const minimap = widgets.get('minimap');
      if (minimap) {
        this.toggleWidget('minimap', options.minimap);
      } else if (options.minimap) {
        const element = document.createElement('arcgis-mini-map') as HTMLElement;
        (element as any).view = this.view;
        await this.addWidget('minimap', element, {
          position: 'bottom-right'
        });
      }
    }

    // Update compass
    if (options.compass !== undefined) {
      const compass = widgets.get('compass');
      if (compass) {
        this.toggleWidget('compass', options.compass);
      } else if (options.compass) {
        const element = document.createElement('arcgis-compass') as HTMLElement;
        (element as any).view = this.view;
        await this.addWidget('compass', element, {
          position: 'top-right'
        });
      }
    }

    // Update coordinates widget
    if (options.coordinates !== undefined) {
      const coords = widgets.get('coordinates');
      if (coords) {
        this.toggleWidget('coordinates', options.coordinates);
      } else if (options.coordinates) {
        const element = document.createElement('arcgis-coordinate-conversion') as HTMLElement;
        (element as any).view = this.view;
        await this.addWidget('coordinates', element, {
          position: 'bottom-left'
        });
      }
    }

    // Update scalebar
    if (options.scalebar) {
      const scalebar = widgets.get('scalebar');
      if (scalebar?.widget instanceof HTMLElement) {
        (scalebar.widget as any).unit = options.scalebar.unit;
      } else {
        const { default: Scalebar } = await import('@arcgis/core/widgets/Scalebar');
        await this.addWidget('scalebar', new Scalebar({
          view: this.view,
          unit: options.scalebar.unit
        }), {
          position: 'bottom-left'
        });
      }
    }
  }

  /**
   * Initialize configured widgets
   */
  private async initializeConfiguredWidgets(): Promise<void> {
    if (!this.view || !this.config.widgets) return;

    try {
      // Add search widget if configured
      if (this.config.widgets.search?.enabled) {
        const searchElement = document.createElement('arcgis-search') as HTMLElement & { view: MapView };
        searchElement.view = this.view;
        await this.addWidget('search', searchElement, {
          position: this.config.widgets.search.position as Position
        });
      }

      // Add basemap toggle if configured
      if (this.config.widgets.basemapToggle?.enabled) {
        const basemapToggleElement = document.createElement('arcgis-basemap-toggle') as HTMLElement & { view: MapView; nextBasemap: string };
        basemapToggleElement.view = this.view;
        basemapToggleElement.nextBasemap = this.config.widgets.basemapToggle.nextBasemap ?? 'satellite';
        await this.addWidget('basemapToggle', basemapToggleElement, {
          position: this.config.widgets.basemapToggle.position as Position
        });
      }

      // Add layer list if configured
      if (this.config.widgets.layerList?.enabled) {
        const [{ default: LayerList }] = await Promise.all([
          import('@arcgis/core/widgets/LayerList')
        ]);

        const layerList = new LayerList({ view: this.view });
        await this.addWidget('layerList', layerList, {
          position: this.config.widgets.layerList.position as Position,
          expanded: this.config.widgets.layerList.expanded,
          expandTooltip: this.localizationService.getLocalizedLabel('שכבות', 'Layers'),
          expandIconClass: 'esri-icon-layers'
        });
      }
    } catch (error) {
      console.error('Error initializing widgets:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (!this.isBrowser || !this.view) return;

    // Remove and clean up all widgets
    const widgets = this.widgetsSubject.value;
    widgets.forEach((instance) => {
      this.removeWidget(instance.id);
    });

    // Reset state
    this.view = null;
    this.widgetsSubject.next(new Map());
  }
}
