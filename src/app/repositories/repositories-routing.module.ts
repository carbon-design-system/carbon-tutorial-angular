import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RepoPageComponent } from './repo-page/repo-page.component';
import { GridModule, TableModule } from 'carbon-components-angular';

const routes: Routes = [
	{
		path: '',
		component: RepoPageComponent
	}
];

@NgModule({
	imports: [RouterModule.forChild(routes), GridModule, TableModule],
	exports: [RouterModule]
})
export class RepositoriesRoutingModule { }
