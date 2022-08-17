// import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
//
// import { QUERY, RepoTableComponent } from './repo-table.component';
// import { LinkModule, PaginationModule, TableModule } from 'carbon-components-angular';
// import { Apollo } from 'apollo-angular';
// import { RepositoriesRoutingModule } from "../repositories-routing.module";
// import { of } from "rxjs";
//
// describe('RepoTableComponent', () => {
// 	let component: RepoTableComponent;
// 	let fixture: ComponentFixture<RepoTableComponent>;
//
// 	beforeEach(waitForAsync(() => {
// 		TestBed.configureTestingModule({
// 			declarations: [RepoTableComponent],
// 			imports: [
// 				TableModule,
// 				LinkModule,
// 				PaginationModule,
// 				RepositoriesRoutingModule,
// 			],
// 			providers: [
// 				{ provide: Apollo, useValue: ApolloStub }
// 			]
// 		})
// 			.compileComponents();
// 	}));
//
// 	beforeEach(() => {
// 		fixture = TestBed.createComponent(RepoTableComponent);
// 		component = fixture.componentInstance;
// 		fixture.detectChanges();
// 	});
//
// 	it('should create', () => {
// 		expect(component).toBeTruthy();
// 	});
// });
//
//
// const ApolloStub = {
// 	watchQuery: (query) => {
// 		return null
// 	},
// 	valueChanges: of({
// 		loading: false,
// 		data: {
// 			organization: {
// 				repositories: {
// 					nodes: [{
// 						name: 'name',
// 						created: 'tomorrow',
// 						updated: 'yesterday',
// 						openIssues: 'one',
// 						start: 5,
// 						links: 'none'
// 					}]
// 				}
// 			}
// 		}
// 	})
// }
