import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { LinkModule, PaginationModule, TableModule } from 'carbon-components-angular';
import { ApolloTestingModule } from 'apollo-angular/testing';

import { RepoTableComponent } from './repo-table.component';

describe('RepoTableComponent', () => {
	let component: RepoTableComponent;
	let fixture: ComponentFixture<RepoTableComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ RepoTableComponent ],
			imports: [
				TableModule,
				LinkModule,
				PaginationModule,
				ApolloTestingModule
			]
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
