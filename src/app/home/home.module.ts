import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreadcrumbModule, GridModule, TabsModule } from 'carbon-components-angular';


import { HomeRoutingModule } from './home-routing.module';
import { LandingPageComponent } from './landing-page/landing-page.component';

@NgModule({
	declarations: [LandingPageComponent],
	imports: [
		CommonModule,
		HomeRoutingModule,
		GridModule,
		BreadcrumbModule,
		TabsModule,
	]
})
export class HomeModule { }
