import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RepositoriesRoutingModule } from './repositories-routing.module';
import { RepoPageComponent } from './repo-page/repo-page.component';
import { BreadcrumbModule, ButtonModule, GridModule, TabsModule, TableModule } from 'carbon-components-angular';
import { RepoTableComponent } from './repo-table/repo-table.component';


@NgModule({
	declarations: [RepoPageComponent, RepoTableComponent],
	imports: [
		CommonModule,
		RepositoriesRoutingModule,
		BreadcrumbModule,
		ButtonModule,
		TabsModule,
		GridModule,
		TableModule
	]
})
export class RepositoriesModule { }
