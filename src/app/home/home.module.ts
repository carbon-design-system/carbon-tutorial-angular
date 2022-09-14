import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { ButtonModule,	GridModule,	TabsModule, BreadcrumbModule } from 'carbon-components-angular';

@NgModule({
	declarations: [LandingPageComponent],
	imports: [
		CommonModule,
		HomeRoutingModule,
		ButtonModule,
		GridModule,
		TabsModule,
		BreadcrumbModule
	]
})
export class HomeModule { }
