import { Component, HostBinding } from '@angular/core';
import { IconService } from "carbon-components-angular";
import Notification20 from '@carbon/icons/es/notification/20';
import UserAvatar20 from '@carbon/icons/es/user--avatar/20';
import AppSwitcher20 from '@carbon/icons/es/switcher/20';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  @HostBinding('class.cds--header') headerClass = true;
  constructor(protected iconService: IconService) {}

  ngOnInit() {
    this.iconService.registerAll([Notification20]);
    this.iconService.registerAll([UserAvatar20]);
    this.iconService.registerAll([AppSwitcher20]);
  }
}
