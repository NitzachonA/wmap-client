import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LocalizationService, SupportedLocale } from './localization/localization.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <nav class="top-bar" [dir]="localizationService.localeDir$ | async">
      <div class="nav-links">
        <a routerLink="/" class="nav-link">{{ currentLocale === 'he' ? 'דף הבית' : 'Home' }}</a>
        <a routerLink="/map" class="nav-link">{{ currentLocale === 'he' ? 'מפה' : 'Map' }}</a>
      </div>
      <div class="locale-toggle">
        <button
          class="locale-btn"
          [class.active]="currentLocale === 'he'"
          (click)="setLocale('he')">עברית</button>
        <button
          class="locale-btn"
          [class.active]="currentLocale === 'en'"
          (click)="setLocale('en')">English</button>
      </div>
    </nav>
    <router-outlet></router-outlet>
  `,
  styles: [`
    .top-bar {
      background-color: #333;
      padding: 1rem;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nav-links {
      display: flex;
      gap: 1rem;
    }
    .nav-link {
      color: white;
      text-decoration: none;
    }
    .nav-link:hover {
      text-decoration: underline;
    }
    .locale-toggle {
      display: flex;
      gap: 0.5rem;
    }
    .locale-btn {
      padding: 0.25rem 0.75rem;
      border: 1px solid #fff;
      border-radius: 4px;
      background: transparent;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
    }
    .locale-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .locale-btn.active {
      background: white;
      color: #333;
    }
    :host {
      display: block;
      height: 100%;
    }
    router-outlet + * {
      display: block;
      height: calc(100% - 3.5rem);
      margin-top: 3.5rem;
    }
  `]
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
