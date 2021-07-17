import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { InfoModule } from "./../info/info.module";
import { HomeRoutingModule } from "./home-routing.module";
import { LandingPageComponent } from "./landing-page/landing-page.component";
import { PersonFavorite32Module } from "@carbon/icons-angular/lib/person--favorite/32";
import { Globe32Module } from "@carbon/icons-angular/lib/globe/32";
import { Application32Module } from "@carbon/icons-angular/lib/application/32";

import {
	BreadcrumbModule,
	ButtonModule,
	GridModule,
	TabsModule,
} from "carbon-components-angular";

@NgModule({
	declarations: [LandingPageComponent],
	imports: [
		CommonModule,
		HomeRoutingModule,
		BreadcrumbModule,
		ButtonModule,
		GridModule,
		TabsModule,
		InfoModule,
		PersonFavorite32Module,
		Globe32Module,
		Application32Module,
	],
})
export class HomeModule {}
