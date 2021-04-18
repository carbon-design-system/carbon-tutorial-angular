import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { RepoPageComponent } from "./repo-page.component";
import {
	GridModule,
	LinkModule,
	TableModule,
	PaginationModule,
} from "carbon-components-angular";
import { RepoTableComponent } from "../repo-table/repo-table.component";
import { Apollo } from "apollo-angular";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { HttpClient } from "@angular/common/http";
import { GraphQLModule } from "../../graphql.module";

describe("RepoPageComponent", () => {
	let component: RepoPageComponent;
	let fixture: ComponentFixture<RepoPageComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [RepoPageComponent, RepoTableComponent],
			imports: [
				HttpClientTestingModule,
				GridModule,
				TableModule,
				LinkModule,
				PaginationModule,
				GraphQLModule,
			],
			providers: [Apollo, HttpClient],
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
