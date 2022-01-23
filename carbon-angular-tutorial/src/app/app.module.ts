import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

import { UIShellModule, IconModule, IconService } from 'carbon-components-angular';

import {
  Notification20,
  UserAvatar20,
  AppSwitcher20,
} from '@carbon/icons';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    UIShellModule,
    IconModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { 
  constructor(protected iconService: IconService) {
    iconService.registerAll([
      Notification20,
      UserAvatar20,
      AppSwitcher20
    ]);
  }
}
