import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

// carbon-components-angular default imports
import { UIShellModule } from 'carbon-components-angular';
import {
  NotificationModule,UserAvatarModule,AppSwitcherModule
} from '@carbon/icons-angular';
const Icons = [
  NotificationModule,UserAvatarModule,AppSwitcherModule
];

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    UIShellModule,
    ...Icons,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
