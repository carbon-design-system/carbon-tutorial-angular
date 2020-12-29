import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RepoTableComponent } from '../repo-table/repo-table.component';
import { RepoPageComponent } from './repo-page.component';
import { GridModule, LinkModule, PaginationModule, Table, TableModule } from 'carbon-components-angular';
import { ApolloTestingModule } from 'apollo-angular/testing';

describe('RepoPageComponent', () => {
	let component: RepoPageComponent;
	let fixture: ComponentFixture<RepoPageComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ RepoPageComponent, RepoTableComponent ],
 			imports: [
				GridModule,
				TableModule,
				ApolloTestingModule,
				LinkModule,
				PaginationModule
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
