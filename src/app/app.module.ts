import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { UIShellModule, IconModule, IconService  } from 'carbon-components-angular';
import { Notification20Module } from '@carbon/icons/lib/notification/20';
import { UserAvatar20Module } from '@carbon/icons/lib/user--avatar/20';
import { AppSwitcher20Module } from '@carbon/icons/lib/app-switcher/20';
import { HeaderComponent } from './header/header.component';
import { GraphQLModule } from './graphql.module';
import { HttpClientModule } from '@angular/common/http';
import { PersonFavorite32Module } from '@carbon/icons/lib/person--favorite/32';
import { Globe32Module } from '@carbon/icons/lib/globe/32';
import { Application32Module } from '@carbon/icons/lib/application/32';
import { LinkModule, PaginationModule } from 'carbon-components-angular';

@NgModule({
	declarations: [
		AppComponent,
		HeaderComponent,
	],
	imports: [
		BrowserModule,
		BrowserAnimationsModule,
		FormsModule,
		AppRoutingModule,
		UIShellModule,
		GraphQLModule,
		HttpClientModule,
		IconModule,
		PaginationModule,
		LinkModule
	],
	bootstrap: [AppComponent]
})
export class AppModule {

}
