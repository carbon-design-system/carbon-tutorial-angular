import { AppRoutingModule } from './app-routing.module';
import { IconModule, UIShellModule } from 'carbon-components-angular';
import { HeaderComponent } from './header/header.component';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { NgModule } from '@angular/core';
import { RouterModule } from "@angular/router";

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
    RouterModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
