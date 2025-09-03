import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapPageComponent } from './map-page.component';
import { MAP_CONFIG } from '../map-config';
import { PLATFORM_ID } from '@angular/core';
import { ArcGISInitService } from '../services/arcgis-init.service';
import { LayerService } from '../services/layer.service';
import { SketchService } from '../services/sketch.service';
import { UIService } from '../services/ui.service';
import { MapStateService } from '../services/map-state.service';
import { SettingsService } from '../services/settings.service';

describe('MapPageComponent', () => {
  let component: MapPageComponent;
  let fixture: ComponentFixture<MapPageComponent>;
  const mockConfig = {
    basemap: 'streets-vector',
    center: [-118.244, 34.052],
    zoom: 12
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapPageComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MAP_CONFIG, useValue: mockConfig },
        ArcGISInitService,
        LayerService,
        SketchService,
        UIService,
        MapStateService,
        SettingsService
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MapPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize map view', async () => {
    const viewContainer = fixture.nativeElement.querySelector('.map-container');
    expect(viewContainer).toBeTruthy();
    expect(viewContainer.id).toBeTruthy();
  });

  it('should clean up on destroy', () => {
    const arcgisService = TestBed.inject(ArcGISInitService);
    const spy = spyOn(arcgisService, 'detach');
    fixture.destroy();
    expect(spy).toHaveBeenCalled();
  });
});
