import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

// carbon-components-angular default imports
import {
  UIShellModule,
  IconModule,
  IconService,
} from 'carbon-components-angular';
// icons
import Notification20 from '@carbon/icons/es/notification/20';
import UserAvatar20 from '@carbon/icons/es/user--avatar/20';
import Switcher20 from '@carbon/icons/es/switcher/20';

@NgModule({
  declarations: [AppComponent, HeaderComponent],
  imports: [BrowserModule, AppRoutingModule, UIShellModule, IconModule],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(protected iconService: IconService) {
    this.iconService.registerAll([Notification20, UserAvatar20, Switcher20]);
  }
}
