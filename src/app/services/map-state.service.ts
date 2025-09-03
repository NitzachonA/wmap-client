import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, ReplaySubject, type Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import type Point from '@arcgis/core/geometry/Point';
import type Extent from '@arcgis/core/geometry/Extent';
import type MapView from '@arcgis/core/views/MapView';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import { MAP_CONFIG, type MapConfig } from '../map-config';

export interface ViewState {
  zoom: number;
  center: [number, number];
  rotation: number;
  extent: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
    spatialReference?: {
      wkid: number;
    };
  };
}

type EasingType = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 
  'cubic-in' | 'cubic-out' | 'cubic-in-out' | 'expo-in' | 'expo-out' | 
  'expo-in-out' | 'quad-in-out-coast' | 'in-cubic';

export interface NavigationOptions {
  duration?: number;
  easing?: EasingType;
  animate?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MapStateService {
  private readonly config: MapConfig;
  private readonly isBrowser: boolean;
  private view: MapView | null = null;

  // State observables
  private readonly viewStateSubject = new BehaviorSubject<ViewState | null>(null);
  private readonly isNavigatingSubject = new BehaviorSubject<boolean>(false);
  private readonly viewReadySubject = new ReplaySubject<boolean>(1);

  // Public observables
  readonly viewState$ = this.viewStateSubject.asObservable();
  readonly isNavigating$ = this.isNavigatingSubject.asObservable();

  /**
   * Check if the view is fully initialized and ready
   */
  private isViewReady(): boolean {
    return !!(
      this.view?.ready &&
      this.view.center &&
      this.view.extent &&
      typeof this.view.zoom === 'number' &&
      typeof this.view.rotation === 'number' &&
      this.view.extent.spatialReference
    );
  }
  readonly viewReady$ = this.viewReadySubject.asObservable();

  // Computed observables
  readonly zoom$ = this.viewState$.pipe(
    map(state => state?.zoom),
    distinctUntilChanged()
  );

  readonly center$ = this.viewState$.pipe(
    map(state => state?.center),
    distinctUntilChanged((prev, curr) => 
      prev?.[0] === curr?.[0] && prev?.[1] === curr?.[1]
    )
  );

  readonly extent$ = this.viewState$.pipe(
    map(state => state?.extent),
    distinctUntilChanged()
  );

  constructor(
    @Inject(MAP_CONFIG) config: MapConfig,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.config = config;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Initialize the service with a MapView
   */
  async initialize(view: MapView): Promise<void> {
    if (!this.isBrowser) return;

    this.view = view;

    // Wait for the view to be ready
    try {
      await view.when();
      
      // Watch for view changes
      this.setupViewWatchers();

      // Set initial state
      await this.updateViewState();

      // Mark view as ready
      this.viewReadySubject.next(true);
    } catch (error) {
      console.error('Error initializing map state:', error);
      this.viewReadySubject.error(error);
      throw error;
    }
  }

  /**
   * Go to a specific point
   */
  async goTo(
    target: Point | [number, number] | { x: number; y: number },
    options?: NavigationOptions & { zoom?: number }
  ): Promise<void> {
    if (!this.isBrowser || !this.view) return;

    try {
      this.isNavigatingSubject.next(true);

      let point: Point;
      if (Array.isArray(target)) {
        const [x, y] = target;
        point = await this.createPoint(x, y);
      } else if ('x' in target && 'y' in target) {
        point = await this.createPoint(target.x, target.y);
      } else {
        point = target;
      }

      await this.view.goTo({
        target: point,
        zoom: options?.zoom,
      }, {
        duration: options?.duration,
        easing: options?.easing,
        animate: options?.animate
      });

      await this.updateViewState();
    } finally {
      this.isNavigatingSubject.next(false);
    }
  }

  /**
   * Go to an extent
   */
  async goToExtent(
    extent: Extent | {
      xmin: number;
      ymin: number;
      xmax: number;
      ymax: number;
      spatialReference?: { wkid: number };
    },
    options?: NavigationOptions
  ): Promise<void> {
    if (!this.isBrowser || !this.view) return;

    try {
      this.isNavigatingSubject.next(true);

      let targetExtent: Extent;
      if ('xmin' in extent) {
        const { default: ExtentClass } = await import('@arcgis/core/geometry/Extent');
        targetExtent = new ExtentClass(extent);
      } else {
        targetExtent = extent;
      }

      await this.view.goTo(targetExtent, {
        duration: options?.duration,
        easing: options?.easing,
        animate: options?.animate
      });

      await this.updateViewState();
    } finally {
      this.isNavigatingSubject.next(false);
    }
  }

  /**
   * Set zoom level
   */
  async setZoom(zoom: number, options?: NavigationOptions): Promise<void> {
    if (!this.isBrowser || !this.view) return;

    try {
      this.isNavigatingSubject.next(true);

      await this.view.goTo({
        zoom
      }, {
        duration: options?.duration,
        easing: options?.easing,
        animate: options?.animate
      });

      await this.updateViewState();
    } finally {
      this.isNavigatingSubject.next(false);
    }
  }

  /**
   * Set rotation angle
   */
  async setRotation(rotation: number, options?: NavigationOptions): Promise<void> {
    if (!this.isBrowser || !this.view) return;

    try {
      this.isNavigatingSubject.next(true);

      await this.view.goTo({
        rotation
      }, {
        duration: options?.duration,
        easing: options?.easing,
        animate: options?.animate
      });

      await this.updateViewState();
    } finally {
      this.isNavigatingSubject.next(false);
    }
  }

  /**
   * Reset view to initial state
   */
  async resetView(options?: NavigationOptions): Promise<void> {
    if (!this.isBrowser || !this.view) return;

    try {
      this.isNavigatingSubject.next(true);

      await this.view.goTo({
        center: this.config.center,
        zoom: this.config.zoom,
        rotation: 0
      }, {
        duration: options?.duration,
        easing: options?.easing,
        animate: options?.animate
      });

      await this.updateViewState();
    } finally {
      this.isNavigatingSubject.next(false);
    }
  }

  /**
   * Get current view state
   */
  getCurrentState(): ViewState | null {
    if (!this.view) return null;
    return {
      zoom: this.view.zoom,
      center: [this.view.center.x, this.view.center.y],
      rotation: this.view.rotation,
      extent: {
        xmin: this.view.extent.xmin,
        ymin: this.view.extent.ymin,
        xmax: this.view.extent.xmax,
        ymax: this.view.extent.ymax,
        spatialReference: this.view.extent.spatialReference?.toJSON()
      }
    };
  }

  /**
   * Set up view watchers
   */
  private setupViewWatchers(): void {
    if (!this.view) return;

    const view = this.view; // Cache view reference to ensure type safety

    // Watch for view changes
    reactiveUtils.watch(
      () => {
        if (!view) return null;
        return [view.center, view.zoom, view.rotation, view.extent];
      },
      (newValue) => {
        if (newValue) this.updateViewState();
      }
    );

    // Watch updating property
    reactiveUtils.watch(
      () => view?.updating ?? false,
      (updating: boolean) => {
        if (!updating) {
          this.isNavigatingSubject.next(false);
        }
      }
    );
  }

  /**
   * Update the view state
   */
  private async updateViewState(): Promise<void> {
    if (!this.view) return;
    
    try {
      // Check if view is fully ready using our utility method
      if (this.isViewReady()) {
        // Cache view reference to ensure type safety
        const view = this.view;
        
        // Verify all required properties are available
        if (!view.center || !view.extent || !view.extent.spatialReference) {
          console.warn('View properties not fully initialized');
          return;
        }

        const state: ViewState = {
          zoom: view.zoom,
          center: [view.center.x, view.center.y],
          rotation: view.rotation,
          extent: {
            xmin: view.extent.xmin,
            ymin: view.extent.ymin,
            xmax: view.extent.xmax,
            ymax: view.extent.ymax,
            spatialReference: view.extent.spatialReference.toJSON()
          }
        };

        this.viewStateSubject.next(state);
      } else {
        console.warn('View not fully ready for state update');
      }
    } catch (error) {
      console.error('Error updating view state:', error);
    }
  }

  /**
   * Create a Point instance
   */
  private async createPoint(x: number, y: number): Promise<Point> {
    const { default: PointClass } = await import('@arcgis/core/geometry/Point');
    return new PointClass({
      x,
      y,
      spatialReference: this.view?.spatialReference
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (!this.isBrowser) return;

    // Reset state
    this.view = null;
    this.viewStateSubject.next(null);
    this.isNavigatingSubject.next(false);
  }
}
