import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoCardComponent } from './info-card/info-card.component';
import { InfoSectionComponent } from './info-section/info-section.component';
import { GridModule } from 'carbon-components-angular';

import { ApplicationModule, PersonFavoriteModule, GlobeModule } from '@carbon/icons-angular';


@NgModule({
	declarations: [InfoCardComponent, InfoSectionComponent],
	imports: [
		CommonModule,
		GridModule,
		ApplicationModule,
		PersonFavoriteModule,
		GlobeModule
	],
	exports: [InfoCardComponent, InfoSectionComponent]
})
export class InfoModule { }
