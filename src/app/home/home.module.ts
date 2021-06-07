import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { BreadcrumbModule, ButtonModule, GridModule, TabsModule, TableModule } from 'carbon-components-angular';


@NgModule({
	declarations: [LandingPageComponent],
	imports: [
		CommonModule,
		HomeRoutingModule,
		BreadcrumbModule,
		ButtonModule,
		TabsModule,
		GridModule,
		TableModule
	]
})
export class HomeModule { }
