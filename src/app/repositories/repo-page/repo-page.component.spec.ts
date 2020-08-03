import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoPageComponent } from './repo-page.component';
import { RepoTableComponent } from '../repo-table/repo-table.component';

import {
    BreadcrumbModule,
    ButtonModule,
    GridModule,
    TabsModule
} from 'carbon-components-angular';

describe('RepoPageComponent', () => {
	let component: RepoPageComponent;
	let fixture: ComponentFixture<RepoPageComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
            imports: [
                BreadcrumbModule,
                ButtonModule,
                GridModule,
                TabsModule
            ],
			declarations: [ RepoPageComponent, RepoTableComponent ],
						schemas: [CUSTOM_ELEMENTS_SCHEMA]
		})
		.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(RepoPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
