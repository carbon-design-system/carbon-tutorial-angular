import { Component } from '@angular/core';
import Notification16 from '@carbon/icons/es/notification/16';
import UserAvatar16 from '@carbon/icons/es/user--avatar/16';
import AppSwitcher16 from '@carbon/icons/es/app-switcher/16';
import { IconService } from 'carbon-components-angular';
import { HeaderComponent } from './header/header.component';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'carbon-angular-tutorial';

  declarations: [HeaderComponent];

  constructor(protected iconService: IconService) {
    iconService.registerAll([
      Notification16,
      UserAvatar16,
      AppSwitcher16
    ]);
  }

}
