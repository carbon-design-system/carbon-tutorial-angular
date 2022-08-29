import { Component } from '@angular/core';
import { IconService } from 'carbon-components-angular';

import Notification16 from '@carbon/icons/es/notification/16';
import UserAvatar16 from '@carbon/icons/es/user--avatar/16';
import Apps16 from '@carbon/icons/es/apps/16';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  constructor(protected iconService: IconService) {
    iconService.registerAll([Notification16, UserAvatar16, Apps16]);
  }
}
