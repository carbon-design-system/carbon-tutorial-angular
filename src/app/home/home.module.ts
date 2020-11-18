import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { LandingPageComponent } from './landing-page/landing-page.component';

import {
	BreadcrumbModule,
		ButtonModule,
		GridModule,
		TabsModule,
} from 'carbon-components-angular';

@NgModule({
	declarations: [LandingPageComponent],
	imports: [
		BreadcrumbModule,
		ButtonModule,
		TabsModule,
		CommonModule,
		HomeRoutingModule,
		GridModule
	]
})
export class HomeModule { }
