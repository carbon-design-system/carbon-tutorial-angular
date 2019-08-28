import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { HomeRoutingModule } from "./home-routing.module";
import { LandingPageComponent } from "./landing-page/landing-page.component";
import { InfoSectionComponent } from "./../info/info-section/info-section.component";
import { InfoCardComponent } from "./../info/info-card/info-card.component";

import {
	BreadcrumbModule,
	ButtonModule,
	GridModule,
	TabsModule
} from "carbon-components-angular";

@NgModule({
	declarations: [LandingPageComponent, InfoSectionComponent, InfoCardComponent],
	imports: [
		CommonModule,
		HomeRoutingModule,
		BreadcrumbModule,
		ButtonModule,
		GridModule,
		TabsModule
	]
})
export class HomeModule { }
