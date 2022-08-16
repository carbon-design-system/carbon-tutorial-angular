import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';



import {
  NotificationModule,
  UserAvatarModule,
  AppSwitcherModule
} from '@carbon/icons-angular';

import { UIShellModule, IconModule } from 'carbon-components-angular';
import { HeaderComponent } from './header/header.component';
import { from } from 'rxjs';

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
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

// constructor(protected iconService: IconService) {
//   iconService.registerAll([
//     NotificationModule,
//   UserAvatarModule,
//   AppSwitcherModule
//   ]);
// }
