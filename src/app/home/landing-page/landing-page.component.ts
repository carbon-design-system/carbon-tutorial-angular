import { Component } from '@angular/core';
import { GridModule, BreadcrumbModule, ButtonModule, TabsModule } from 'carbon-components-angular';
import { NgModule } from '@angular/core';

@Component({
	selector: 'app-landing-page',
	templateUrl: './landing-page.component.html',
	styleUrls: ['./landing-page.component.scss']
})

@NgModule({
	imports: [GridModule, BreadcrumbModule,  ButtonModule, TabsModule]
})

export class LandingPageComponent {
}
