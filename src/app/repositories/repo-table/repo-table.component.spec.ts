import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { RepoTableComponent } from './repo-table.component';
import {
	TableModule,
	LinkModule,
	PaginationModule,
} from 'carbon-components-angular';
import { Apollo } from 'apollo-angular';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { GraphQLModule } from '../../graphql.module';

describe("RepoTableComponent", () => {
	let component: RepoTableComponent;
	let fixture: ComponentFixture<RepoTableComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [RepoTableComponent],
			imports: [
				HttpClientTestingModule,
				TableModule,
				LinkModule,
				PaginationModule,
				GraphQLModule,
			],
			providers: [Apollo, HttpClient],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(RepoTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
