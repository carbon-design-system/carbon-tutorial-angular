import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoModule } from './../info/info.module';
import { HomeRoutingModule } from './home-routing.module';
import { LandingPageComponent } from './landing-page/landing-page.component';
import {
	BreadcrumbModule,
	ButtonModule,
	GridModule,
	TabsModule
} from 'carbon-components-angular';

@NgModule({
	declarations: [LandingPageComponent],
	imports: [
		CommonModule,
		HomeRoutingModule,
		BreadcrumbModule,
		ButtonModule,
		GridModule,
		TabsModule,
		InfoModule
	]
})
export class HomeModule { }
