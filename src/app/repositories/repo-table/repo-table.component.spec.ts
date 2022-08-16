import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoTableComponent } from './repo-table.component';
import { TableModule } from 'carbon-components-angular';
import { Apollo } from 'apollo-angular';
import { ApolloTestingBackend } from "apollo-angular/testing/backend";

describe('RepoTableComponent', () => {
	let component: RepoTableComponent;
	let fixture: ComponentFixture<RepoTableComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [RepoTableComponent],
			imports: [
				TableModule
			],
			providers: [
				{ provide: Apollo, useClass: ApolloTestingBackend }
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
