import { NgModule } from '@angular/core';
import { Component } from '@angular/core';
import { BreadcrumbModule, ButtonModule, GridModule, TabsModule } from "carbon-components-angular";

@Component({
	selector: 'app-landing-page',
	templateUrl: './landing-page.component.html',
	styleUrls: ['./landing-page.component.scss']
})

@NgModule({
	imports: [BreadcrumbModule, ButtonModule, GridModule, TabsModule]
  })
export class LandingPageComponent {
}
