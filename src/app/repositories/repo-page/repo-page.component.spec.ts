import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoPageComponent } from './repo-page.component';
import { RepoTableComponent } from '../repo-table/repo-table.component';
import { GridModule, TableModule } from 'carbon-components-angular';


describe('RepoPageComponent', () => {
	let component: RepoPageComponent;
	let fixture: ComponentFixture<RepoPageComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [RepoPageComponent, RepoTableComponent, GridModule, TableModule]
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
