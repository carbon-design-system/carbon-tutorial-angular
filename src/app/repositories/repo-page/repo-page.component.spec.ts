import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoPageComponent } from './repo-page.component';

import { RepoTableComponent } from '../repo-table/repo-table.component';
import { GridModule } from 'carbon-components-angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('RepoPageComponent', () => {
	let component: RepoPageComponent;
	let fixture: ComponentFixture<RepoPageComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			imports: [GridModule],
			declarations: [
				RepoPageComponent ,
				RepoTableComponent
			],
			schemas: [ CUSTOM_ELEMENTS_SCHEMA ]
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
