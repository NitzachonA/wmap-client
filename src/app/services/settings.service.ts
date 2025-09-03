import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

export interface MapSettings {
  basemap: string;
  showLabels: boolean;
  terrain3D: boolean;
  defaultViewMode: '2d' | '3d';
}

export interface UISettings {
  theme: 'light' | 'dark' | 'auto';
  scalebarUnit: 'metric' | 'imperial';
  mouseCoordinates: boolean;
  minimap: boolean;
  compass: boolean;
}

export interface UserPreferences {
  language: string;
  map: MapSettings;
  ui: UISettings;
}

const DEFAULT_SETTINGS: UserPreferences = {
  language: 'en',
  map: {
    basemap: 'streets-vector',
    showLabels: true,
    terrain3D: false,
    defaultViewMode: '2d'
  },
  ui: {
    theme: 'auto',
    scalebarUnit: 'metric',
    mouseCoordinates: true,
    minimap: true,
    compass: true
  }
};

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly storageKey = 'wmap_user_preferences';
  private readonly isBrowser: boolean;
  private readonly settingsSubject: BehaviorSubject<UserPreferences>;

  // Public observables
  readonly settings$: Observable<UserPreferences>;
  readonly theme$: Observable<UISettings['theme']>;
  readonly language$: Observable<string>;
  readonly mapSettings$: Observable<MapSettings>;
  readonly uiSettings$: Observable<UISettings>;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.settingsSubject = new BehaviorSubject<UserPreferences>(this.loadSettings());

    // Initialize observables
    this.settings$ = this.settingsSubject.asObservable();
    this.theme$ = this.settings$.pipe(
      map(settings => settings.ui.theme),
      distinctUntilChanged()
    );
    this.language$ = this.settings$.pipe(
      map(settings => settings.language),
      distinctUntilChanged()
    );
    this.mapSettings$ = this.settings$.pipe(
      map(settings => settings.map),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
    );
    this.uiSettings$ = this.settings$.pipe(
      map(settings => settings.ui),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
    );
  }

  /**
   * Get current settings
   */
  getCurrentSettings(): UserPreferences {
    return this.settingsSubject.value;
  }

  /**
   * Update language setting
   */
  setLanguage(language: string): void {
    this.updateSettings({ language });
  }

  /**
   * Update map settings
   */
  updateMapSettings(settings: Partial<MapSettings>): void {
    const currentSettings = this.settingsSubject.value;
    this.updateSettings({
      map: {
        ...currentSettings.map,
        ...settings
      }
    });
  }

  /**
   * Update UI settings
   */
  updateUISettings(settings: Partial<UISettings>): void {
    const currentSettings = this.settingsSubject.value;
    this.updateSettings({
      ui: {
        ...currentSettings.ui,
        ...settings
      }
    });
  }

  /**
   * Reset all settings to defaults
   */
  resetToDefaults(): void {
    this.settingsSubject.next(DEFAULT_SETTINGS);
    this.saveSettings();
  }

  /**
   * Import settings from JSON
   */
  importSettings(jsonSettings: string): boolean {
    try {
      const settings = JSON.parse(jsonSettings);
      if (this.validateSettings(settings)) {
        this.settingsSubject.next(settings);
        this.saveSettings();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Export settings to JSON
   */
  exportSettings(): string {
    return JSON.stringify(this.settingsSubject.value, null, 2);
  }

  /**
   * Update settings
   */
  private updateSettings(update: Partial<UserPreferences>): void {
    const currentSettings = this.settingsSubject.value;
    const newSettings = {
      ...currentSettings,
      ...update
    };
    this.settingsSubject.next(newSettings);
    this.saveSettings();
  }

  /**
   * Load settings from storage
   */
  private loadSettings(): UserPreferences {
    if (!this.isBrowser) {
      return DEFAULT_SETTINGS;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return DEFAULT_SETTINGS;
      }

      const settings = JSON.parse(stored);
      if (this.validateSettings(settings)) {
        return settings;
      }
    } catch {
      // If there's any error, return defaults
    }

    return DEFAULT_SETTINGS;
  }

  /**
   * Save settings to storage
   */
  private saveSettings(): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify(this.settingsSubject.value)
      );
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Validate settings object
   */
  private validateSettings(settings: any): settings is UserPreferences {
    if (!settings || typeof settings !== 'object') {
      return false;
    }

    // Check required top-level properties
    if (!settings.language || !settings.map || !settings.ui) {
      return false;
    }

    // Validate map settings
    const mapValid = 
      typeof settings.map.basemap === 'string' &&
      typeof settings.map.showLabels === 'boolean' &&
      typeof settings.map.terrain3D === 'boolean' &&
      (settings.map.defaultViewMode === '2d' || settings.map.defaultViewMode === '3d');

    if (!mapValid) {
      return false;
    }

    // Validate UI settings
    const uiValid =
      ['light', 'dark', 'auto'].includes(settings.ui.theme) &&
      ['metric', 'imperial'].includes(settings.ui.scalebarUnit) &&
      typeof settings.ui.mouseCoordinates === 'boolean' &&
      typeof settings.ui.minimap === 'boolean' &&
      typeof settings.ui.compass === 'boolean';

    return uiValid;
  }
}
