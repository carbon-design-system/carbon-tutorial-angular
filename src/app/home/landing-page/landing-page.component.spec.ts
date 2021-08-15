import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingPageComponent } from './landing-page.component';
import { BreadcrumbModule, ButtonModule, GridModule, TabsModule } from 'carbon-components-angular';
import { InfoModule } from '../../info/info.module';
import { PersonFavorite32Module } from '@carbon/icons-angular/lib/person--favorite/32';
import { Globe32Module } from '@carbon/icons-angular/lib/globe/32';
import { Application32Module } from '@carbon/icons-angular/lib/application/32';

describe('LandingPageComponent', () => {
	let component: LandingPageComponent;
	let fixture: ComponentFixture<LandingPageComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [
				LandingPageComponent
			],
			imports: [
				BreadcrumbModule,
				ButtonModule,
				GridModule,
				TabsModule,
				InfoModule,
				PersonFavorite32Module,
				Globe32Module,
				Application32Module
			]
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
