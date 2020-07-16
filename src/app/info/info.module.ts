import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoCardComponent } from './info-card/info-card.component';
import { InfoSectionComponent } from './info-section/info-section.component';
import { PersonFavorite32Module } from '@carbon/icons-angular/lib/person--favorite/32';
import { Globe32Module } from '@carbon/icons-angular/lib/globe/32';
import { Application32Module } from '@carbon/icons-angular/lib/application/32';
import { GridModule } from 'carbon-components-angular';

@NgModule({
	declarations: [InfoCardComponent, InfoSectionComponent],
	imports: [
		CommonModule,
		GridModule,
		PersonFavorite32Module,
		Globe32Module,
		Application32Module,
	],
	exports: [InfoCardComponent, InfoSectionComponent]
})
export class InfoModule { }
