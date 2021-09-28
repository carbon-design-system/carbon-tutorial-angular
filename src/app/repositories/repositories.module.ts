import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { RepositoriesRoutingModule } from "./repositories-routing.module";
import { RepoPageComponent } from "./repo-page/repo-page.component";
import { RepoTableComponent } from "./repo-table/repo-table.component";
import {
	GridModule,
	TableModule,
	LinkModule,
	PaginationModule,
} from "carbon-components-angular";
import { GraphQLModule } from '../graphql.module';

@NgModule({
	declarations: [RepoPageComponent, RepoTableComponent],
	imports: [
		GraphQLModule,
		LinkModule,
		PaginationModule,
		CommonModule,
		RepositoriesRoutingModule,
		GridModule,
		TableModule,
	],
})
export class RepositoriesModule {}
