import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeRoutingModule } from './home-routing.module';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { LinkModule, PaginationModule } from 'carbon-components-angular';
import {  TableModule } from 'carbon-components-angular';
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
		LinkModule,
		PaginationModule,
		TableModule
	]
})
export class HomeModule { }
