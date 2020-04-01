import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RepositoriesRoutingModule } from './repositories-routing.module';
import { RepoPageComponent } from './repo-page/repo-page.component';
import { GridModule, TableModule, LinkModule, PaginationModule, UIShellModule } from 'carbon-components-angular';
import { RepoTableComponent } from './repo-table/repo-table.component';
import { Apollo, ApolloModule } from 'apollo-angular';
import { GraphQLModule } from '../graphql.module';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
	declarations: [RepoPageComponent, RepoTableComponent],
	imports: [
		CommonModule,
		RepositoriesRoutingModule,
		GridModule,
		 TableModule,
		 LinkModule,
		 PaginationModule,
		 UIShellModule,
		 ApolloModule
	],
})
export class RepositoriesModule { }
