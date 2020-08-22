import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';

import { AppSwitcherModule } from '@carbon/icons-angular';
import { NotificationModule } from '@carbon/icons-angular';
import { UserAvatarModule } from '@carbon/icons-angular';
import { UIShellModule } from 'carbon-components-angular';

@NgModule({
	declarations: [AppComponent, HeaderComponent],
	imports: [
		BrowserModule,
		AppRoutingModule,
		AppSwitcherModule,
		NotificationModule,
		UserAvatarModule,
		UIShellModule,
	],
	bootstrap: [AppComponent],
})
export class AppModule {}
