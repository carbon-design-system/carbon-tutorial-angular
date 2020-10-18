import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RepoPageComponent } from './repo-page.component';
import { GridModule, TableModule, LinkModule, PaginationModule } from 'carbon-components-angular';
import { RepoTableComponent } from '../repo-table/repo-table.component';
import { Apollo } from 'apollo-angular';
import { GraphQLModule } from '../../graphql.module';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

describe('RepoPageComponent', () => {
	let component: RepoPageComponent;
	let fixture: ComponentFixture<RepoPageComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ RepoPageComponent, RepoTableComponent ],
			imports: [
				GridModule,
				TableModule,
				LinkModule,
				PaginationModule,
				GraphQLModule,
				HttpClientTestingModule
			],
			providers: [Apollo, HttpClient]
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
