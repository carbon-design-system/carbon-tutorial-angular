import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
	BreadcrumbModule,
	ButtonModule,
	GridModule,
	TabsModule,
	} from 'carbon-components-angular';
import { HomeRoutingModule } from './home-routing.module';
import { LandingPageComponent } from './landing-page/landing-page.component';

@NgModule({
	declarations: [LandingPageComponent],
	imports: [
		BreadcrumbModule,
		CommonModule,
		HomeRoutingModule,
		GridModule,
		TabsModule
	]
})
export class HomeModule { }
