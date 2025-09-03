import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { SketchService } from './sketch.service';
import { MAP_CONFIG } from '../map-config';
import type MapView from '@arcgis/core/views/MapView';
import type Graphic from '@arcgis/core/Graphic';

describe('SketchService', () => {
  let service: SketchService;
  const mockConfig = {
    basemap: 'streets-vector',
    center: [-118.244, 34.052],
    zoom: 12
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SketchService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MAP_CONFIG, useValue: mockConfig }
      ]
    });
    service = TestBed.inject(SketchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with correct state', () => {
    service.canUndo$.subscribe(canUndo => {
      expect(canUndo).toBeFalse();
    });

    service.canRedo$.subscribe(canRedo => {
      expect(canRedo).toBeFalse();
    });

    service.hasFeatures$.subscribe(hasFeatures => {
      expect(hasFeatures).toBeFalse();
    });
  });

  it('should handle view initialization', async () => {
    const mockView = {
      ready: true,
      when: () => Promise.resolve(),
      map: {
        add: jasmine.createSpy('add'),
        remove: jasmine.createSpy('remove')
      },
      ui: {
        add: jasmine.createSpy('add'),
        remove: jasmine.createSpy('remove')
      }
    } as unknown as MapView;

    await service.initialize(mockView);
    expect(mockView.map.add).toHaveBeenCalled();
  });

  it('should handle cleanup', async () => {
    const mockGraphic = {} as Graphic;
    const mockView = {
      ready: true,
      when: () => Promise.resolve(),
      map: {
        add: jasmine.createSpy('add'),
        remove: jasmine.createSpy('remove')
      },
      ui: {
        add: jasmine.createSpy('add'),
        remove: jasmine.createSpy('remove')
      }
    } as unknown as MapView;

    await service.initialize(mockView);
    service.destroy();

    service.canUndo$.subscribe(canUndo => {
      expect(canUndo).toBeFalse();
    });

    service.hasFeatures$.subscribe(hasFeatures => {
      expect(hasFeatures).toBeFalse();
    });
  });
});
