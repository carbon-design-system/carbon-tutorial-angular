import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

import { Routes, RouterModule } from '@angular/router';
import { RepoPageComponent } from './repo-page/repo-page.component';

const routes: Routes = [
	{
		path: '',
		component: RepoPageComponent
	}
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
	schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class RepositoriesRoutingModule { }
