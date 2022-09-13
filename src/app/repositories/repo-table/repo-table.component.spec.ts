// import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
//
// import { RepoTableComponent } from './repo-table.component';
// import { TableModule } from 'carbon-components-angular';
// import { Apollo } from "apollo-angular";
// import { of } from "rxjs";
// import { Component } from "@angular/core";
//
// describe('RepoTableComponent', () => {
// 	let component: RepoTableComponent;
// 	let fixture: ComponentFixture<RepoTableComponent>;
//
// 	beforeEach(fakeAsync(() => {
// 		TestBed.configureTestingModule({
// 			declarations: [RepoTableComponent, IbmPaginationComponent],
// 			imports: [
// 				TableModule
// 			],
// 			providers: [
// 				// { provide: Apollo, useValue: ApolloStub }
// 				Apollo
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
// const ApolloStub = {
// 	watchQuery: () => of([]),
// 	valueChanges: of([])
// }
//
// @Component({
// 	selector: 'ibm-pagination',
// 	template: '<p>whatever</p>'
// })
// class IbmPaginationComponent {}
