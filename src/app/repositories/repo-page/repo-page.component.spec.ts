import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoPageComponent } from './repo-page.component';
import { GridModule, TableModule } from 'carbon-components-angular';
import { RepoTableComponent } from '../repo-table/repo-table.component';

import { LinkModule, PaginationModule } from 'carbon-components-angular';

import { Apollo } from 'apollo-angular';

describe('RepoPageComponent', () => {
	let component: RepoPageComponent;
	let fixture: ComponentFixture<RepoPageComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ RepoPageComponent, RepoTableComponent ],
			imports: [
				GridModule,
				TableModule,
				LinkModule,
				PaginationModule
			],
			providers: [ Apollo ]
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
