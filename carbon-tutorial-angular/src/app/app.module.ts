import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

import { NotificationModule } from '@carbon/icons-angular';
import { UserAvatarModule } from '@carbon/icons-angular';
import { AppSwitcherModule } from '@carbon/icons-angular';

// carbon-components-angular default imports
import { UIShellModule, IconModule, IconService } from 'carbon-components-angular';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    UIShellModule,
    IconModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(protected iconService: IconService) {
    iconService.registerAll([
      NotificationModule,
      UserAvatarModule,
      AppSwitcherModule
    ]);
  }
  
 }
