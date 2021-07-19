import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { LinkModule, PaginationModule } from 'carbon-components-angular';
import { RepoTableComponent } from './repo-table.component';
import { TableModule } from 'carbon-components-angular';
import { Apollo } from 'apollo-angular';
import { GraphQLModule } from '../../graphql.module';
import {
	HttpClientTestingModule,
	HttpTestingController,
} from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

describe('RepoTableComponent', () => {
	let component: RepoTableComponent;
	let fixture: ComponentFixture<RepoTableComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [RepoTableComponent],
			imports: [
				TableModule,
				LinkModule,
				PaginationModule,
				GraphQLModule,
				HttpClientTestingModule,
			],
			providers: [Apollo, HttpClient],
		}).compileComponents();
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
