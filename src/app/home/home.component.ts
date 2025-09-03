import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  // Empty on purpose
  template: `<div class="home"></div>`,
  styles: [`.home{display:block;}`]
})
export class HomeComponent {}
