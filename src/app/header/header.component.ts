import { Component, OnInit, HostBinding } from '@angular/core';

import { IconService } from 'carbon-components-angular';
import { Notification20, UserAvatar20, AppSwitcher20  } from "@carbon/icons";

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})


export class HeaderComponent {
  constructor(protected iconService: IconService) {
    iconService.registerAll([
      Notification20,
      UserAvatar20,
      AppSwitcher20
    ]);
  }

  @HostBinding('class.bx--header') headerClass = true;
}
