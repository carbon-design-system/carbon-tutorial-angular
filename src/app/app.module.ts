import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { UIShellModule } from 'carbon-components-angular';
import { NotificationModule, UserAvatarModule, AppSwitcherModule } from '@carbon/icons-angular';
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
		NotificationModule,
		UserAvatarModule,
		AppSwitcherModule,
		GraphQLModule,
		HttpClientModule
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
