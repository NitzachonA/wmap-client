import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import type Sketch from '@arcgis/core/widgets/Sketch';
import type Expand from '@arcgis/core/widgets/Expand';
import type MapView from '@arcgis/core/views/MapView';
import type Graphic from '@arcgis/core/Graphic';
import { ArcGISInitService } from './arcgis-init.service';
import { MAP_CONFIG, type MapConfig } from '../map-config';

@Injectable({
  providedIn: 'root'
})
export class SketchService {
  private readonly config: MapConfig;
  private readonly arcgisService: ArcGISInitService;
  private readonly isBrowser: boolean;
  
  private sketch: Sketch | null = null;
  private sketchExpand: Expand | null = null;
  private graphicsLayer: GraphicsLayer | null = null;
  private operations = 0;

  constructor(
    @Inject(MAP_CONFIG) config: MapConfig,
    @Inject(PLATFORM_ID) platformId: Object,
    arcgisService: ArcGISInitService
  ) {
    this.config = config;
    this.arcgisService = arcgisService;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // State signals
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  readonly hasFeatures = signal(false);

  // Observable state streams
  private readonly canUndoSubject = new BehaviorSubject<boolean>(false);
  private readonly canRedoSubject = new BehaviorSubject<boolean>(false);
  private readonly hasFeaturesSubject = new BehaviorSubject<boolean>(false);

  readonly canUndo$ = this.canUndoSubject.asObservable();
  readonly canRedo$ = this.canRedoSubject.asObservable();
  readonly hasFeatures$ = this.hasFeaturesSubject.asObservable();

  /**
   * Initialize the sketch service with a view instance
   * @param view The MapView instance to attach the sketch widget to
   */
  async initialize(view: MapView): Promise<void> {
    if (!this.isBrowser) return;
    
    try {
      const [{ default: GraphicsLayer }] = await Promise.all([
        import('@arcgis/core/layers/GraphicsLayer')
      ]);

      // Create graphics layer for sketches
      this.graphicsLayer = new GraphicsLayer({
        title: this.config.sketchLayer?.title ?? 'Sketch Layer',
        visible: this.config.sketchLayer?.visible ?? true
      });

      // Add graphics layer to map
      if (view.map) {
        view.map.add(this.graphicsLayer);
      }

      // Initialize sketch widget
      await this.createSketchWidget(view);
    } catch (error) {
      console.error('Error initializing sketch service:', error);
    }
  }

  /**
   * Create and configure the sketch widget
   */
  private async createSketchWidget(view: MapView): Promise<void> {
    const [{ default: Sketch }, { default: Expand }] = await Promise.all([
      import('@arcgis/core/widgets/Sketch'),
      import('@arcgis/core/widgets/Expand')
    ]);

    // Create and configure Sketch widget
    this.sketch = new Sketch({
      view,
      layer: this.graphicsLayer!,
      availableCreateTools: ['point', 'polyline', 'polygon', 'rectangle', 'circle'],
      defaultCreateOptions: {
        mode: 'click'
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

    // Wrap Sketch in Expand widget
    this.sketchExpand = new Expand({
      view,
      content: this.sketch,
      expandIcon: 'edit'
    });

    // Add to UI
    view.ui.add(this.sketchExpand, 'top-right');

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for sketch operations
   */
  private setupEventListeners(): void {
    if (!this.sketch) return;

    this.sketch.on('create', (event) => {
      if (event.state === 'complete') {
        this.operations++;
        this.updateOperationState();
        this.emitGeometryChange(event.graphic);
      }
    });

    this.sketch.on('update', (event) => {
      if (event.state === 'complete') {
        this.operations++;
        this.updateOperationState();
        event.graphics.forEach(graphic => this.emitGeometryChange(graphic));
      }
    });

    this.sketch.on('undo', () => {
      this.operations--;
      this.updateOperationState();
    });

    this.sketch.on('redo', () => {
      this.operations++;
      this.updateOperationState();
    });
  }

  /**
   * Update the undo/redo state signals
   */
  private updateOperationState(): void {
    const canUndo = this.operations > 0;
    const canRedo = this.operations < (this.sketch?.layer.graphics.length ?? 0);
    const hasFeatures = (this.sketch?.layer.graphics.length ?? 0) > 0;

    // Update signals
    this.canUndo.set(canUndo);
    this.canRedo.set(canRedo);
    this.hasFeatures.set(hasFeatures);

    // Update subjects
    this.canUndoSubject.next(canUndo);
    this.canRedoSubject.next(canRedo);
    this.hasFeaturesSubject.next(hasFeatures);
  }

  /**
   * Emit geometry changes for persistence
   */
  private emitGeometryChange(graphic: Graphic): void {
    // TODO: Implement geometry persistence
    console.log('Geometry changed:', graphic.geometry);
  }

  /**
   * Clear all graphics from the sketch layer
   */
  clear(): void {
    if (!this.graphicsLayer || !this.sketch) return;
    this.graphicsLayer.removeAll();
    this.operations = 0;
    this.updateOperationState();
  }

  /**
   * Undo the last sketch operation
   */
  undo(): void {
    if (!this.sketch) return;
    this.sketch.undo();
  }

  /**
   * Redo the last undone sketch operation
   */
  redo(): void {
    if (!this.sketch) return;
    this.sketch.redo();
  }

  /**
   * Clean up sketch widget resources
   */
  destroy(): void {
    if (this.sketch?.view) {
      const view = this.sketch.view;
      
      // Remove from UI and destroy
      if (this.sketchExpand) {
        view.ui.remove(this.sketchExpand);
        this.sketchExpand.destroy();
        this.sketchExpand = null;
      }
      
      if (this.sketch) {
        this.sketch.destroy();
        this.sketch = null;
      }

      // Remove graphics layer
      if (this.graphicsLayer && view.map) {
        view.map.remove(this.graphicsLayer);
        this.graphicsLayer = null;
      }

      // Reset state
      this.operations = 0;
      this.canUndo.set(false);
      this.canRedo.set(false);
      this.hasFeatures.set(false);

      // Complete subjects
      this.canUndoSubject.next(false);
      this.canRedoSubject.next(false);
      this.hasFeaturesSubject.next(false);
      this.canUndoSubject.complete();
      this.canRedoSubject.complete();
      this.hasFeaturesSubject.complete();
    }
  }
}
