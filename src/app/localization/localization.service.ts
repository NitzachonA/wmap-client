import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject, Observable, map } from 'rxjs';

export type SupportedLocale = 'he' | 'en';

@Injectable({
  providedIn: 'root'
})
export class LocalizationService {
  private readonly document = inject(DOCUMENT);
  private readonly currentLocaleSubject = new BehaviorSubject<SupportedLocale>('he');

  readonly current$ = this.currentLocaleSubject.asObservable();
  readonly localeDir$ = this.current$.pipe(
    map(locale => this.getDirection(locale))
  );

  constructor() {
    // Initialize with Hebrew, reading from document if available
    const initialLocale = this.document.documentElement.lang as SupportedLocale || 'he';
    this.setLocale(initialLocale);
  }

  async setLocale(locale: SupportedLocale): Promise<void> {
    try {
      const { setLocale } = await import('@arcgis/core/intl');
      await setLocale(locale);
      
      // Update HTML element attributes
      const html = this.document.documentElement;
      html.lang = locale;
      html.dir = this.getDirection(locale);
      
      this.currentLocaleSubject.next(locale);
    } catch (error) {
      console.error('Failed to set locale:', error);
    }
  }

  private getDirection(locale: SupportedLocale): 'rtl' | 'ltr' {
    return locale === 'he' ? 'rtl' : 'ltr';
  }

  getLocalizedLabel(heLabel: string, enLabel: string): string {
    return this.currentLocaleSubject.value === 'he' ? heLabel : enLabel;
  }
}
