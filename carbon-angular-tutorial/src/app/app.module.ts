import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IconModule, IconService, UIShellModule } from 'carbon-components-angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { USED_CARBON_ICONS } from './app.const';

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
  providers: [IconService],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(
    protected iconService: IconService,
  ) { 
    iconService.registerAll(USED_CARBON_ICONS)
  }
}
