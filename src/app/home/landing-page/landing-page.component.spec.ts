import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { LandingPageComponent } from './landing-page.component';
import {
	BreadcrumbModule,
	ButtonModule,
	GridModule,
	TabsModule
} from 'carbon-components-angular';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core'

describe('LandingPageComponent', () => {
	let component: LandingPageComponent;
	let fixture: ComponentFixture<LandingPageComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ LandingPageComponent ],
			imports: [
				BreadcrumbModule,
				ButtonModule,
				GridModule,
				TabsModule
			],
			schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
		})
		.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(LandingPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
