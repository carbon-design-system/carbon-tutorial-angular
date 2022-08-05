import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LandingPageComponent } from './landing-page.component';
import { BreadcrumbModule, ButtonModule, GridModule, TabsModule } from "carbon-components-angular";
import { HomeRoutingModule } from "../home-routing.module";
import { CommonModule } from "@angular/common";
import { RouterTestingModule } from "@angular/router/testing";

describe('LandingPageComponent', () => {
	let component: LandingPageComponent;
	let fixture: ComponentFixture<LandingPageComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [ LandingPageComponent ],
			imports: [ CommonModule, GridModule, BreadcrumbModule, TabsModule, ButtonModule, HomeRoutingModule, RouterTestingModule]
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
