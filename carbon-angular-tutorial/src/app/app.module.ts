import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

import { UIShellModule, IconModule, IconService } from 'carbon-components-angular';
import Notification16 from '@carbon/icons/es/notification/20';
import UserAvatar16 from '@carbon/icons/es/user--avatar/20';
import AppSwitcher16 from '@carbon/icons/es/app-switcher/20';

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
            Notification16,
            UserAvatar16,
            AppSwitcher16
        ]);
    }
}
