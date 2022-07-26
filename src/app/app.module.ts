import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
// carbon-components-angular default imports
import {
  IconModule,
  IconService,
  UIShellModule,
} from 'carbon-components-angular';
import Notification16 from '@carbon/icons/es/notification/16';
import UserAvatar16 from '@carbon/icons/es/user--avatar/16';
import Apps16 from '@carbon/icons/es/apps/16';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

@NgModule({
  declarations: [AppComponent, HeaderComponent],
  imports: [BrowserModule, AppRoutingModule, UIShellModule, IconModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(protected iconService: IconService) {
    iconService.registerAll([Notification16, UserAvatar16, Apps16]);
  }
}
