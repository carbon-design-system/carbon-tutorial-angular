import { NgModule, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconService, IconModule } from "carbon-components-angular";
import Notification20 from '@carbon/icons/es/notification/20';
import UserAvatar20 from '@carbon/icons/es/user--avatar/20';
import AppSwitcher20 from '@carbon/icons/es/app-switcher/20';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    IconModule
  ]
})
export class HeaderModule { 
  constructor(protected iconService: IconService) { }
  @HostBinding('class.cds--header') headerClass = true;
  ngOnInit(): void {
    this.iconService.registerAll([Notification20, UserAvatar20, AppSwitcher20]);
  }
}
