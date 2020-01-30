import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoCardComponent } from './info-card.component';
import { InfoSectionComponent } from '../info-section/info-section.component';

describe('InfoCardComponent', () => {
	let component: InfoCardComponent;
	let fixture: ComponentFixture<InfoCardComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ InfoCardComponent, InfoSectionComponent ]
		})
		.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(InfoCardComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
