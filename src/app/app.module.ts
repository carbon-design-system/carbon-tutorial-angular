import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { AppRoutingModule } from './app-routing.module';
import { Routes, RouterModule } from '@angular/router';
// carbon-components-angular default imports
import { UIShellModule } from 'carbon-components-angular';
import { Notification20Module } from '@carbon/icons-angular/lib/notification/20';
import { UserAvatar20Module } from '@carbon/icons-angular/lib/user--avatar/20';
import { AppSwitcher20Module } from '@carbon/icons-angular/lib/app-switcher/20';

@NgModule({
	declarations: [
		AppComponent,
		HeaderComponent
	],
	imports: [
		BrowserModule,
		AppRoutingModule,
		RouterModule,
		RouterModule.forRoot(routes, {useHash: true}),
		UIShellModule
	],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule { }
