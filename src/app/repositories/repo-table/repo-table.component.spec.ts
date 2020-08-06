import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import {
	ApolloTestingModule
} from 'apollo-angular/testing';

import { Apollo } from 'apollo-angular';
import { RepoTableComponent } from './repo-table.component';
import { TableModule, GridModule } from 'carbon-components-angular';
import { LinkModule, PaginationModule } from 'carbon-components-angular';
import { NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

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
				LinkModule,
				PaginationModule
			],
			providers: [Apollo],
			schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
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
