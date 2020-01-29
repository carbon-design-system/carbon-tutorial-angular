import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridModule, BreadcrumbModule, TabsModule, ButtonModule } from 'carbon-components-angular';
import { HomeRoutingModule } from './home-routing.module';
import { LandingPageComponent } from './landing-page/landing-page.component';

@NgModule({
	declarations: [LandingPageComponent],
	imports: [
		CommonModule,
		HomeRoutingModule,
		BreadcrumbModule,
		GridModule,
		TabsModule,
		ButtonModule
	]
})
export class HomeModule { }
