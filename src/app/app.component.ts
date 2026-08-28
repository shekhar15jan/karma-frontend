import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppVersionService } from './core/app-version/app-version.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
  styles: [`:host { display: contents; }`],
})
export class AppComponent implements OnInit {
  constructor(private readonly appVersion: AppVersionService) {}

  ngOnInit(): void {
    this.appVersion.start();
  }
}
