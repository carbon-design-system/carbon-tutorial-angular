import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { UIShellModule, IconModule } from 'carbon-components-angular';
import { NotificationModule, UserAvatarModule, AppSwitcherModule } from '@carbon/icons-angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

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
    NotificationModule,
    UserAvatarModule,
    AppSwitcherModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
