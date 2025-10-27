import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-back-button',
  standalone: true,
  templateUrl: './back-button.component.html',
  styleUrls: ['./back-button.component.scss']
})
export class BackButtonComponent {
  constructor(private location: Location) {}

  goBack() {
    this.location.back();
  }
}
