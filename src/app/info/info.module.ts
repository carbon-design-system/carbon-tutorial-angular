import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoCardComponent } from './info-card/info-card.component';
import { InfoSectionComponent } from './info-section/info-section.component';



@NgModule({
	declarations: [InfoCardComponent, InfoSectionComponent],
	imports: [
		CommonModule
	]
})
export class InfoModule { }
