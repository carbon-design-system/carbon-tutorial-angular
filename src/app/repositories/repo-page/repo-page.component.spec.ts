import { async, ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { RepoPageComponent } from './repo-page.component';
import { RepoTableComponent } from '../repo-table/repo-table.component';
import { GridModule, TableModule } from 'carbon-components-angular';

describe('RepoPageComponent', () => {
	let component: RepoPageComponent;
	let fixture: ComponentFixture<RepoPageComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			imports: [GridModule, TableModule],
			declarations: [ RepoPageComponent, RepoTableComponent ]
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
