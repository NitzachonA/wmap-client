import { InjectionToken } from '@angular/core';
import type APIKeyConfig from '@arcgis/core/config';
import type Basemap from '@arcgis/core/Basemap';
import type SpatialReference from '@arcgis/core/geometry/SpatialReference';

export interface MapConfig {
  // Core map setup
  basemap?: Basemap | string;
  portalItem?: {
    id: string;
    portal?: {
      url: string;
      apiKey?: string;
    };
  };
  
  // Initial view state
  center?: [number, number];
  zoom?: number;
  spatialReference?: SpatialReference;
  
  // Optional constraints
  viewConstraints?: {
    minZoom?: number;
    maxZoom?: number;
    rotationEnabled?: boolean;
    constraints?: {
      minScale?: number;
      maxScale?: number;
      geometry?: __esri.Geometry;
      effectiveMaxScale?: number;
      effectiveMinScale?: number;
    };
  };
  
  // Authentication/Portal
  apiKey?: string;
  portalUrl?: string;

  // Layers configuration
  layers?: Array<{
    id: string;
    title: string;
    visible?: boolean;
    type: 'feature' | 'graphics' | 'tile' | 'vector-tile';
    url?: string;
    opacity?: number;
    minScale?: number;
    maxScale?: number;
    definitionExpression?: string;
  }>;
  sketchLayer?: {
    title: string;
    visible?: boolean;
  };

  // Widget configuration
  widgets?: {
    search?: {
      position: string;
      enabled: boolean;
    };
    basemapToggle?: {
      position: string;
      enabled: boolean;
      nextBasemap?: string;
    };
    layerList?: {
      position: string;
      enabled: boolean;
      expanded?: boolean;
    };
  };
}

export const MAP_CONFIG = new InjectionToken<MapConfig>('MAP_CONFIG');

// Default config as a constant for easy reuse
export const DEFAULT_MAP_CONFIG: MapConfig = {
  basemap: 'topo-vector',
  center: [35.2137, 31.7683], // Jerusalem
  zoom: 12,
  viewConstraints: {
    minZoom: 3,
    maxZoom: 18,
    rotationEnabled: true
  },
  layers: [
    {
      id: 'world-cities',
      title: 'World Cities',
      type: 'feature',
      url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Cities/FeatureServer/0',
      visible: true,
      opacity: 0.8
    }
  ],
  sketchLayer: {
    title: 'Sketch Layer',
    visible: true
  },
  widgets: {
    search: {
      position: 'top-right',
      enabled: true
    },
    basemapToggle: {
      position: 'bottom-right',
      enabled: true,
      nextBasemap: 'satellite'
    },
    layerList: {
      position: 'top-left',
      enabled: true,
      expanded: false
    }
  }
};
