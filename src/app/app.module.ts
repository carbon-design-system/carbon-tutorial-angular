import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

import {
  UIShellModule,
  IconModule,
  // IconService,
} from 'carbon-components-angular';
// import Notification16 from "@carbon/icons/es/notification/16";
// import UserAvatar16 from "@carbon/icons/es/user--avatar/16";
// import AppSwitcher16 from "@carbon/icons/es/app-switcher/16";

import {
  NotificationModule,
  UserAvatarModule,
  AppSwitcherModule,
} from '@carbon/icons-angular';

@NgModule({
  declarations: [AppComponent, HeaderComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    UIShellModule,
    IconModule,
    NotificationModule,
    UserAvatarModule,
    AppSwitcherModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {
  // constructor(protected iconService: IconService) {
  //   iconService.registerAll([
  //     NotificationModule,
  //     UserAvatarModule,
  //     AppSwitcherModule,
  //   ]);
  // }
}
