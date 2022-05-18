import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RepositoriesRoutingModule } from './repositories-routing.module';
import { RepoPageComponent } from './repo-page/repo-page.component';
import { GridModule, TableModule } from 'carbon-components-angular';
import { RepoTableComponent } from './repo-table/repo-table.component';
import { LinkModule, PaginationModule } from 'carbon-components-angular';
import { ApolloModule } from 'apollo-angular';


@NgModule({
	declarations: [RepoPageComponent, RepoTableComponent],
	imports: [
		CommonModule,
		RepositoriesRoutingModule,
		GridModule,
 		TableModule,
		LinkModule,
		PaginationModule,
		ApolloModule,
	]
})
export class RepositoriesModule { }
