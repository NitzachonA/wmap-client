import type MapView from '@arcgis/core/views/MapView';

// Define custom ArcGIS web components
declare global {
  interface ArcGISSearchElement extends HTMLElement {
    view: MapView;
  }
  interface ArcGISBasemapToggleElement extends HTMLElement {
    view: MapView;
    nextBasemap: string;
  }
}

export { ArcGISSearchElement, ArcGISBasemapToggleElement };
