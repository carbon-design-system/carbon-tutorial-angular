import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { IconModule, UIShellModule } from 'carbon-components-angular';
import { HomeModule } from './home/home.module';
import { RepositoriesModule } from './repositories/repositories.module';

// carbon-components-angular default imports

@NgModule({
  declarations: [AppComponent, HeaderComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    UIShellModule,
    IconModule,
    HomeModule,
    RepositoriesModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
