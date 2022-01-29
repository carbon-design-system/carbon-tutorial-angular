import { Component, HostBinding } from '@angular/core';
import { IconService } from 'carbon-components-angular';

import Notification20 from '@carbon/icons/es/notification/20';
import UserAvatar20 from '@carbon/icons/es/user--avatar/20';
import AppSwitcher20 from '@carbon/icons/es/app-switcher/20';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})

export class HeaderComponent {
  @HostBinding('class.bx--header') headerClass = true;
  
  constructor(protected iconService: IconService) {
    iconService.registerAll([
      Notification20,
      UserAvatar20,
      AppSwitcher20
    ]);
  }
}
