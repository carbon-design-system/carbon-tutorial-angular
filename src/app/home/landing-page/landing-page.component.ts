import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
	BreadcrumbModule,
	ButtonModule,
	GridModule,
	TabsModule,
} from 'carbon-components-angular';
@Component({
	selector: 'app-landing-page',
	templateUrl: './landing-page.component.html',
	styleUrls: ['./landing-page.component.scss']
})

@NgModule({
	declarations: [LandingPageComponent],
	imports: [
		CommonModule,
		GridModule,
		BreadcrumbModule,
		ButtonModule,
		TabsModule
	]
})

export class LandingPageComponent {
}
