import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ApolloTestingModule } from 'apollo-angular/testing';

import { RepoTableComponent } from './repo-table.component';
import {  LinkModule, PaginationModule, TableModule } from 'carbon-components-angular';

describe('RepoTableComponent', () => {
	let component: RepoTableComponent;
	let fixture: ComponentFixture<RepoTableComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ RepoTableComponent ],
			imports: [
				TableModule,
				LinkModule,
				ApolloTestingModule,
				PaginationModule
			]
		})
		.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(RepoTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

});
