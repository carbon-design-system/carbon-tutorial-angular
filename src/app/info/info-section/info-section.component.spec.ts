import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { InfoSectionComponent } from './info-section.component';
import { IconService } from "carbon-components-angular";
import { Component } from "@angular/core";

describe('InfoSectionComponent', () => {
	let component: InfoSectionComponent;
	let fixture: ComponentFixture<InfoSectionComponent>;

	beforeEach(waitForAsync( () => {
		TestBed.configureTestingModule({
			declarations: [InfoSectionComponent, InfoCardMockComponent],
			providers:[
				IconService
			]
		})
			.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(InfoSectionComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});


@Component({
	selector: 'app-info-card',
	template: '<p>whatever</p>'
})
class InfoCardMockComponent {

}
