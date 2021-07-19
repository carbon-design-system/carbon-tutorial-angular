import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoSectionComponent } from "./info-section.component";
import { InfoCardComponent } from "./../info-card/info-card.component";
import { GridModule } from "carbon-components-angular";
import { PersonFavorite32Module } from "@carbon/icons-angular/lib/person--favorite/32";
import { Globe32Module } from "@carbon/icons-angular/lib/globe/32";
import { Application32Module } from "@carbon/icons-angular/lib/application/32";
import * as data from "../info.json";

describe("InfoSectionComponent", () => {
	let component: InfoSectionComponent;
	let fixture: ComponentFixture<InfoSectionComponent>;
	// let data:any = dataJSON;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [InfoSectionComponent, InfoCardComponent],
			imports: [
				GridModule,
				PersonFavorite32Module,
				Globe32Module,
				Application32Module,
			],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(InfoSectionComponent);
		component = fixture.componentInstance;
		component.heading = data.title;
		component.items = data.items;

		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});