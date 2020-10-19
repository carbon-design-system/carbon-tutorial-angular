import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoModule } from "./../info/info.module";
import { HomeRoutingModule } from './home-routing.module';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { InfoSectionComponent } from './../info/info-section/info-section.component';
import { InfoCardComponent } from './../info/info-card/info-card.component';
import { PersonFavorite32Module } from "@carbon/icons-angular/lib/person--favorite/32";
import { Globe32Module } from "@carbon/icons-angular/lib/globe/32";
import { Application32Module } from "@carbon/icons-angular/lib/application/32";

import {
	BreadcrumbModule,
	ButtonModule,
	GridModule,
	TabsModule
} from 'carbon-components-angular';

@NgModule({
	declarations: [LandingPageComponent, InfoSectionComponent, InfoCardComponent],
	imports: [
		CommonModule,
		HomeRoutingModule,
		BreadcrumbModule,
		ButtonModule,
		GridModule,
		TabsModule,
		PersonFavorite32Module,
		Globe32Module,
		Application32Module
	]
})
export class HomeModule { }
