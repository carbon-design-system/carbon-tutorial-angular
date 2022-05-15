import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import {AppSwitcherModule, NotificationModule, UserAvatarModule} from '@carbon/icons-angular'
import { IconModule, UIShellModule } from 'carbon-components-angular';
import { HomeModule } from './home/home.module';
import { RepositoriesModule } from './repositories/repositories.module';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent
  ],
  imports: [
    HomeModule,
    RepositoriesModule,
    BrowserModule,
    AppRoutingModule,
    UIShellModule,
    IconModule,
    NotificationModule,
    AppSwitcherModule,
    UserAvatarModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
