import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { UIShellModule, IconModule, IconService } from 'carbon-components-angular';
import { NotificationModule, UserAvatarModule, AppSwitcherModule } from '@carbon/icons-angular';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    UIShellModule,
    IconModule,
    UserAvatarModule,
    NotificationModule,
    AppSwitcherModule
    
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(){
  }
}