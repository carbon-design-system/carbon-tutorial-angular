import { ComponentFixture, TestBed } from '@angular/core/testing';
import { default as data } from '../info.json';

import { InfoCardComponent } from './info-card.component';

describe('InfoCardComponent', () => {
	let component: InfoCardComponent;
	let fixture: ComponentFixture<InfoCardComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			declarations: [ InfoCardComponent ]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(InfoCardComponent);
		component = fixture.componentInstance;
		component.heading = data.items.map((item) => item.heading)[0];
		component.content = data.items.map((item) => item.content)[0];
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
