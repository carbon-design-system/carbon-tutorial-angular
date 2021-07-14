import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

// carbon-components-angular default imports
import { UIShellModule, IconModule, IconService } from 'carbon-components-angular';
//import { Notification16 } from '@carbon/icons/es/notification/16';
import { Notification16 } from '@carbon/icons/es/add/16';
import { AddModule } from '@carbon/icons-angular';

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
    AddModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { 
  constructor(protected iconService: IconService) {
    /*iconService.registerAll([
      Notification16
    ]);*/
  }
}
