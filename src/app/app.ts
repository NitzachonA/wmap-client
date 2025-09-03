import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LocalizationService, SupportedLocale } from './localization/localization.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: 'app.html',
  styleUrls: ['app.scss']
})
export class App {
  protected readonly localizationService = inject(LocalizationService);
  protected currentLocale: SupportedLocale = 'he';

  constructor() {
    this.localizationService.current$.subscribe(
      locale => this.currentLocale = locale
    );
  }

  protected setLocale(locale: SupportedLocale): void {
    this.localizationService.setLocale(locale);
  }
}
