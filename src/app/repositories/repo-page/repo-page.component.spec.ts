import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { RepoPageComponent } from "./repo-page.component";
import { RepoTableComponent } from "../repo-table/repo-table.component";

import {
	GridModule,
	TableModule,
	LinkModule,
	PaginationModule,
} from "carbon-components-angular";

import { ApolloModule } from "apollo-angular";
import { HttpClientModule } from "@angular/common/http";
import { GraphQLModule } from "../../graphql.module";
import { HttpLinkModule } from "apollo-angular-link-http";

describe("RepoPageComponent", () => {
	let component: RepoPageComponent;
	let fixture: ComponentFixture<RepoPageComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [RepoPageComponent, RepoTableComponent],
			imports: [
				GridModule,
				TableModule,
				LinkModule,
				PaginationModule,
				ApolloModule,
				HttpClientModule,
				HttpLinkModule,
				GraphQLModule,
			],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(RepoPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
