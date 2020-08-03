import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { RepoTableComponent } from './repo-table.component';
import { GridModule, TableModule, PaginationModule, LinkModule } from 'carbon-components-angular';
import {
	ApolloTestingModule,
	ApolloTestingController,
} from 'apollo-angular/testing';

import { Apollo } from 'apollo-angular';

describe('RepoTableComponent', () => {
	let component: RepoTableComponent;
	let fixture: ComponentFixture<RepoTableComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ RepoTableComponent ],
			imports: [
				ApolloTestingModule.withClients(['clientA', 'clientB']),
								GridModule,
								TableModule,
								PaginationModule,
								LinkModule
			],
						providers: [ Apollo ],
			schemas: [ CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA ]
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
