import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { GridModule, TableModule } from 'carbon-components-angular';
import { RepoPageComponent } from '../repo-page/repo-page.component';

import { RepoTableComponent } from './repo-table.component';

describe('RepoTableComponent', () => {
	let component: RepoTableComponent;
	let fixture: ComponentFixture<RepoTableComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ RepoPageComponent, RepoTableComponent ],
			imports: [TableModule, GridModule]
		})
		.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(RepoTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
