import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoPageComponent } from './repo-page.component';
import { GridModule, TableModule } from 'carbon-components-angular';
import { RepoTableComponent } from '../repo-table/repo-table.component';

describe('RepoPageComponent', () => {
	let component: RepoPageComponent;
	let fixture: ComponentFixture<RepoPageComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [ RepoPageComponent, RepoTableComponent ],
			imports: [
				GridModule,
				TableModule
			]
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
