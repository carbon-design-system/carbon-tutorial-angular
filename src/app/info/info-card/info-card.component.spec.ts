import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoCardComponent } from "./info-card.component";
import { GridModule } from "carbon-components-angular";
import { PersonFavorite32Module } from "@carbon/icons-angular/lib/person--favorite/32";
import { Globe32Module } from "@carbon/icons-angular/lib/globe/32";
import { Application32Module } from "@carbon/icons-angular/lib/application/32";
import * as data from "../info.json";

describe("InfoCardComponent", () => {
	let component: InfoCardComponent;
	let fixture: ComponentFixture<InfoCardComponent>;
	let items: any = data.items;
	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [InfoCardComponent],
			imports: [
				GridModule,
				PersonFavorite32Module,
				Globe32Module,
				Application32Module,
			],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(InfoCardComponent);
		component = fixture.componentInstance;
		component.heading = items[0].heading;
		component.content = items[0].content;
		fixture.detectChanges();
	});
	it("should create", () => {
		expect(component).toBeTruthy();
	});
});