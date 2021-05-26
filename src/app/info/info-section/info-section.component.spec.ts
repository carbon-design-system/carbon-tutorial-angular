import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA, SimpleChange, SimpleChanges } from '@angular/core';
import { InfoSectionComponent } from './info-section.component';
import * as data from '../info.json';

describe('InfoSectionComponent', () => {
	let component: InfoSectionComponent;
	let fixture: ComponentFixture<InfoSectionComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ InfoSectionComponent ],
			schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
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
