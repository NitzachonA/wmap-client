declare namespace JSX {
  interface IntrinsicElements {
    'arcgis-search': any;
    'arcgis-basemap-toggle': any;
    'calcite-action': any;
    'calcite-button': any;
    'calcite-icon': any;
  }
}

interface ArcGISSearchElement extends HTMLElement {
  view: __esri.MapView;
}

interface ArcGISBasemapToggleElement extends HTMLElement {
  view: __esri.MapView;
  nextBasemap: string;
}

interface CalciteIconElement extends HTMLElement {
  icon?: string;
  scale?: 's' | 'm' | 'l';
}

interface CalciteActionElement extends HTMLElement {
  icon?: string;
  text?: string;
  scale?: 's' | 'm' | 'l';
}

interface CalciteButtonElement extends HTMLElement {
  icon?: string;
  iconStart?: string;
  iconEnd?: string;
  scale?: 's' | 'm' | 'l';
}

declare global {
  interface HTMLElementTagNameMap {
    'arcgis-search': ArcGISSearchElement;
    'arcgis-basemap-toggle': ArcGISBasemapToggleElement;
    'calcite-icon': CalciteIconElement;
    'calcite-action': CalciteActionElement;
    'calcite-button': CalciteButtonElement;
  }
}
