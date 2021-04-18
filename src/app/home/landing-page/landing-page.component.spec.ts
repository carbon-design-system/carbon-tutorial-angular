import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingPageComponent } from './landing-page.component';
import {
	BreadcrumbModule,
	ButtonModule,
	GridModule,
	TabsModule,
} from 'carbon-components-angular';
import { InfoModule } from './../../info/info.module';

describe('LandingPageComponent', () => {
	let component: LandingPageComponent;
	let fixture: ComponentFixture<LandingPageComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [LandingPageComponent],
			imports: [
				BreadcrumbModule,
				ButtonModule,
				GridModule,
				TabsModule,
				InfoModule,
			],
		}).compileComponents();
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
