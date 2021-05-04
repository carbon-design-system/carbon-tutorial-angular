import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { RepoTableComponent } from './repo-table.component';
import { LinkModule, PaginationModule } from 'carbon-components-angular';
import { RepoPageComponent } from '../repo-page/repo-page.component';
import { GridModule, TableModule } from 'carbon-components-angular';
import { UIShellModule } from 'carbon-components-angular';

describe('RepoTableComponent', () => {
	let component: RepoTableComponent;
	let fixture: ComponentFixture<RepoTableComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ RepoPageComponent, RepoTableComponent ],
			imports: [
				RouterTestingModule,
				TableModule,
				LinkModule,
				PaginationModule,
				GridModule,
				UIShellModule
			]
		})
		.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(RepoTableComponent);
		component = fixture.componentInstance;
		// fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
