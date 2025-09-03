import { TestBed } from '@angular/core/testing';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { MAP_CONFIG } from '../map-config';
import { LayerService } from './layer.service';
import type Layer from '@arcgis/core/layers/Layer';
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import type MapView from '@arcgis/core/views/MapView';
import type Map from '@arcgis/core/Map';

describe('LayerService', () => {
  let service: LayerService;
  const mockConfig = {
    basemap: 'streets-vector',
    center: [-118.244, 34.052],
    zoom: 12
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LayerService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MAP_CONFIG, useValue: mockConfig }
      ]
    });
    service = TestBed.inject(LayerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add and get layers', async () => {
    const mockLayer = {
      id: 'test-layer'
    } as Layer;

    const mockMap = {
      add: jasmine.createSpy('add')
    } as unknown as Map;

    const mockView = {
      map: mockMap
    } as unknown as MapView;

    await service.initialize(mockView);
    await service.add({ id: 'test-layer', layer: mockLayer });

    const layer = service.get('test-layer');
    expect(layer).toBe(mockLayer);
    expect(mockMap.add).toHaveBeenCalledWith(mockLayer);
  });

  it('should remove layers', async () => {
    const mockLayer = {
      id: 'test-layer'
    } as Layer;

    const mockMap = {
      add: jasmine.createSpy('add'),
      remove: jasmine.createSpy('remove')
    } as unknown as Map;

    const mockView = {
      map: mockMap
    } as unknown as MapView;

    await service.initialize(mockView);
    await service.add({ id: 'test-layer', layer: mockLayer });
    await service.remove('test-layer');

    expect(mockMap.remove).toHaveBeenCalledWith(mockLayer);
    expect(service.get('test-layer')).toBeUndefined();
  });

  it('should create graphics layers on demand', async () => {
    let createdLayer: GraphicsLayer | null = null;

    const mockMap = {
      add: (layer: GraphicsLayer) => {
        createdLayer = layer;
      }
    } as unknown as Map;

    const mockView = {
      map: mockMap
    } as unknown as MapView;

    await service.initialize(mockView);
    const layer = await service.ensureGraphicsLayer('test-graphics');

    expect(layer).toBeTruthy();
    expect(layer.id).toBe('test-graphics');
    expect(createdLayer).toBe(layer);
  });
});
