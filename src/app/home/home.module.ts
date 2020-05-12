import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridModule, BreadcrumbModule, ButtonModule, TabsModule } from 'carbon-components-angular';

import { HomeRoutingModule } from './home-routing.module';
import { LandingPageComponent } from './landing-page/landing-page.component';

@NgModule({
	declarations: [LandingPageComponent],
	imports: [
		CommonModule,
		GridModule,
		BreadcrumbModule,
		ButtonModule,
		TabsModule,
		HomeRoutingModule
	]
})
export class HomeModule { }
