import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { InfoSectionComponent } from "./info-section/info-section.component";
import { InfoCardComponent } from "./info-card/info-card.component";

import {
	GridModule
} from "carbon-components-angular";


@NgModule({
	declarations: [InfoSectionComponent, InfoCardComponent],
	imports: [
		CommonModule,
		GridModule
	]
})
export class InfoModule { }
