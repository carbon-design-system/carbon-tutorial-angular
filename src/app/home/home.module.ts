import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
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
		CommonModule,
		HomeRoutingModule,
		GridModule,
		BreadcrumbModule,
		ButtonModule,
		TabsModule
	]
})
export class HomeModule { }
