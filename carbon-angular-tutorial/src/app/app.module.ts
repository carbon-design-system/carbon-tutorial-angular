import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

// carbon-components-angular default imports
import { UIShellModule, IconModule } from 'carbon-components-angular';
// import Notification from '@carbon/icons/es/notification';
// import UserAvatar from '@carbon/icons/es/user--avatar';
// import AppSwitcher from '@carbon/icons/es/app-switcher';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    UIShellModule,
    IconModule,
    // Notification,
    // UserAvatar,
    // AppSwitcher
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
