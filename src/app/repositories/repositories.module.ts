import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { RepositoriesRoutingModule } from "./repositories-routing.module";
import { RepoPageComponent } from "./repo-page/repo-page.component";
import {
	GridModule,
	LinkModule,
	TableModule,
	PaginationModule,
} from "carbon-components-angular";
import { RepoTableComponent } from "./repo-table/repo-table.component";
import { GraphQLModule } from "../graphql.module";

@NgModule({
	declarations: [RepoPageComponent, RepoTableComponent],
	imports: [
		CommonModule,
		RepositoriesRoutingModule,
		GridModule,
		TableModule,
		GraphQLModule,
		LinkModule,
		PaginationModule,
	],
})
export class RepositoriesModule {}
