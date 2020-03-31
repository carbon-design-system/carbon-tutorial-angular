import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { BreadcrumbModule, GridModule, TabsModule, UIShellModule } from 'carbon-components-angular';

@NgModule({
	declarations: [LandingPageComponent],
	imports: [
		CommonModule,
		HomeRoutingModule,
		GridModule,
		BreadcrumbModule,
		TabsModule,
		UIShellModule
	]
})
export class HomeModule { }
