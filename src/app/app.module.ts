import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// carbon-components-angular default imports
import { UIShellModule, IconModule } from 'carbon-components-angular';
import { HeaderComponent } from './header/header.component';
import { GraphQLModule } from './graphql.module';
import { HttpClientModule } from '@angular/common/http';
import { LinkModule, PaginationModule } from 'carbon-components-angular';

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
  		GraphQLModule,
  		HttpClientModule,
		IconModule,
		PaginationModule,
		LinkModule
	],
	exports: [
		// HeaderComponent,
  	],
	bootstrap: [AppComponent]
})
export class AppModule { }
