import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoCardComponent } from './info-card.component';

describe('InfoCardComponent', () => {
	let component: InfoCardComponent;
	let fixture: ComponentFixture<InfoCardComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ InfoCardComponent ]
		})
		.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(InfoCardComponent);
		component = fixture.componentInstance;
		component.heading = 'Test Heading';
		component.content = 'Test Content';
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
