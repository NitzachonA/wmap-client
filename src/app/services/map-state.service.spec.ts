import { TestBed } from '@angular/core/testing';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { MAP_CONFIG } from '../map-config';
import { MapStateService } from './map-state.service';
import type MapView from '@arcgis/core/views/MapView';

describe('MapStateService', () => {
  let service: MapStateService;
  const mockConfig = {
    basemap: 'streets-vector',
    center: [-118.244, 34.052],
    zoom: 12
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MapStateService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MAP_CONFIG, useValue: mockConfig }
      ]
    });
    service = TestBed.inject(MapStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with null view state', (done) => {
    service.viewState$.subscribe(state => {
      expect(state).toBeNull();
      done();
    });
  });

  it('should handle view initialization', async () => {
    const mockView = {
      ready: true,
      center: { x: -118.244, y: 34.052 },
      zoom: 12,
      rotation: 0,
      extent: {
        xmin: -118.3,
        ymin: 34.0,
        xmax: -118.2,
        ymax: 34.1,
        spatialReference: {
          wkid: 4326,
          toJSON: () => ({ wkid: 4326 })
        }
      },
      when: () => Promise.resolve()
    } as unknown as MapView;

    await service.initialize(mockView);

    service.viewState$.subscribe(state => {
      expect(state).toBeTruthy();
      if (state) {
        expect(state.zoom).toBe(12);
        expect(state.center).toEqual([-118.244, 34.052]);
        expect(state.rotation).toBe(0);
      }
    });
  });

  it('should handle destroy', () => {
    const mockView = {
      ready: true,
      center: { x: -118.244, y: 34.052 },
      zoom: 12,
      rotation: 0,
      extent: {
        xmin: -118.3,
        ymin: 34.0,
        xmax: -118.2,
        ymax: 34.1,
        spatialReference: {
          wkid: 4326,
          toJSON: () => ({ wkid: 4326 })
        }
      }
    } as unknown as MapView;

    service['view'] = mockView;
    service.destroy();
    expect(service['view']).toBeNull();
  });
});
