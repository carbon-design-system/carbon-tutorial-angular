import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Apollo } from 'apollo-angular';
import { RepoPageComponent } from './repo-page.component';
import { GridModule, TableModule, PaginationModule, } from 'carbon-components-angular';
import { RepoTableComponent } from '../repo-table/repo-table.component';
import { GraphQLModule } from '../../graphql.module';
import {
	HttpClientTestingModule,
} from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';

describe('RepoPageComponent', () => {
	let component: RepoPageComponent;
	let fixture: ComponentFixture<RepoPageComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [RepoPageComponent, RepoTableComponent],
			imports: [
				GridModule,
				TableModule,
				PaginationModule,
				GraphQLModule,
				HttpClientTestingModule
			],
			providers: [Apollo, HttpClient],
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
