import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

// carbon-components-angular default imports
import { IconModule, UIShellModule } from 'carbon-components-angular';
import { RouterModule } from "@angular/router";
import { AppRoutingModule } from "./app-routing.module";
import { GraphQLModule } from "./graphql.module";
import { HttpClientModule } from "@angular/common/http";

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
		RouterModule,
		IconModule,
		GraphQLModule,
		HttpClientModule
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
