import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RepoPageComponent } from './repo-page/repo-page.component';
import { RepoTableComponent } from './repo-table/repo-table.component';

const routes: Routes = [
	{
		path: '',
		component: RepoPageComponent
	}
];

@NgModule({
	declarations: [ RepoPageComponent, RepoTableComponent ],
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule]
})
export class RepositoriesRoutingModule { }
