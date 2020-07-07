import { Component, NgModule } from '@angular/core';
import { BreadcrumbModule, GridModule } from "carbon-components-angular";
@NgModule ({
	imports: [BreadcrumbModule, GridModule]
})

@Component({
	selector: 'app-landing-page',
	templateUrl: './landing-page.component.html',
	styleUrls: ['./landing-page.component.scss']
	
})

export class LandingPageComponent {
}
