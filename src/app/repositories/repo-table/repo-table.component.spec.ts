import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoTableComponent } from './repo-table.component';
import { TableModule, LinkModule, PaginationModule } from 'carbon-components-angular';
import { ApolloModule, Apollo } from 'apollo-angular';
import { HttpLink, HttpLinkModule } from 'apollo-angular-link-http';
import { HttpClientModule } from '@angular/common/http';
import { GraphQLModule } from '../../graphql.module';

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
				ApolloModule,
				HttpLinkModule,
				HttpClientModule,
				GraphQLModule
			],
			providers: [
				Apollo,
				HttpLink
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
