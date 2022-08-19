import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'carbon-angular-tutorial';

  @HostBinding('class.bx--header') headerClass = true;
  constructor() {}
}
