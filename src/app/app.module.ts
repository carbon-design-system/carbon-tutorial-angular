import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';


// carbon-components-angular default imports
import { UIShellModule } from 'carbon-components-angular';
import { Notification20Module } from '@carbon/icons-angular/lib/notification/20';
import { UserAvatar20Module } from '@carbon/icons-angular/lib/user--avatar/20';
import { AppSwitcher20Module } from '@carbon/icons-angular/lib/app-switcher/20';
import { HeaderComponent } from './header/header.component';
import { GraphQLModule } from './graphql.module';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
	declarations: [
		AppComponent,
		HeaderComponent
	],
	imports: [
		BrowserModule,
		BrowserAnimationsModule,
		FormsModule,
		AppRoutingModule,
		UIShellModule,
		Notification20Module,
		UserAvatar20Module,
		AppSwitcher20Module,
		GraphQLModule,
		HttpClientModule
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
